import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => {
  const model = () =>
    new Proxy(
      {},
      {
        get(t: any, prop: string) {
          if (!(prop in t)) t[prop] = vi.fn().mockResolvedValue(undefined);
          return t[prop];
        },
      },
    );
  const root: any = new Proxy(
    {},
    {
      get(t: any, prop: string) {
        if (!(prop in t)) t[prop] = model();
        return t[prop];
      },
    },
  );
  return root;
});

vi.mock('@nexus/database', () => ({
  default: prismaMock,
  initDatabase: vi.fn().mockResolvedValue(undefined),
  getDbStatus: vi.fn(() => ({ usingFallback: false, activeUrl: 'test', manualSwitch: false })),
  PrismaClient: class PrismaClientMock {},
}));

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

function retailerToken(): string {
  return jwt.sign({ userId: 'u_ret', email: 'ret@example.com', role: 'RETAILER' }, JWT_SECRET, { expiresIn: '2h' });
}

function setupStore() {
  prismaMock.store.findUnique.mockResolvedValue({
    id: 'store_1', slug: 'adorn', ownerId: 'u_ret', isActive: true, name: 'Adorn', settings: null, theme: null,
  });
}

const GOOD_FILE = `---
name: Beaded Sandals
price: 30000
category: Shoes
stock: 5
featured: yes
---
name: Print Dress
price: 45000
category: Dresses
published: yes
`;

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_ret', role: 'RETAILER', isActive: true });
  setupStore();
});

describe('bulk product upload', () => {
  it('preview classifies categories and surfaces per-product errors without writing', async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: 'cat_1', name: 'Shoes', slug: 'shoes' }]);
    const res = await request(app)
      .post('/api/products/bulk-preview')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: GOOD_FILE + '---\nname: Bad\nprice: abc\n' });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    const sandals = res.body.data.rows.find((r: any) => r.name === 'Beaded Sandals');
    expect(sandals.categoryAction).toBe('existing');
    const dress = res.body.data.rows.find((r: any) => r.name === 'Print Dress');
    expect(dress.categoryAction).toBe('will create');
    const bad = res.body.data.rows.find((r: any) => r.name === 'Bad');
    expect(bad.errors.some((e: any) => e.field === 'price')).toBe(true);
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it('import creates DRAFT products by default, PUBLISHED when asked, with generated slug+sku', async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: 'cat_1', name: 'Shoes', slug: 'shoes' }, { id: 'cat_2', name: 'Dresses', slug: 'dresses' }]);
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));

    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: GOOD_FILE });

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(2);
    const calls = prismaMock.product.create.mock.calls.map((c: any) => c[0].data);
    const sandals = calls.find((d: any) => d.name === 'Beaded Sandals');
    expect(sandals.status).toBe('DRAFT');
    expect(sandals.categoryId).toBe('cat_1');
    expect(sandals.sku).toMatch(/^BULK-/);
    expect(sandals.isFeatured).toBe(true);
    const dress = calls.find((d: any) => d.name === 'Print Dress');
    expect(dress.status).toBe('PUBLISHED');
  });

  it('auto-creates unknown categories during import', async () => {
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.category.create.mockResolvedValue({ id: 'cat_NEW', name: 'Dresses', slug: 'dresses-ab12' });
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));

    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: GOOD_FILE.split('---')[1] + '\n' }); // just the sandals block

    expect(res.status).toBe(200);
    expect(res.body.data.newCategories).toContain('Shoes');
    expect(prismaMock.category.create).toHaveBeenCalled();
    const data = prismaMock.product.create.mock.calls[0][0].data;
    expect(data.categoryId).toBe('cat_NEW');
  });

  it('skips invalid blocks and reports them instead of failing the whole import', async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: 'cat_1', name: 'Shoes', slug: 'shoes' }]);
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));
    const mixed = GOOD_FILE + '---\nname: Broken One\nprice: not-a-number\n';

    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: mixed });

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(2);
    expect(res.body.data.skippedCount).toBe(1);
    expect(res.body.data.skipped[0].name).toBe('Broken One');
    expect(prismaMock.product.create).toHaveBeenCalledTimes(2);
  });

  it('rejects files with structural problems (no products / over cap)', async () => {
    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: '# only comments' });
    expect(res.status).toBe(400);
  });

  it('requires the store owner', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', slug: 'adorn', ownerId: 'someone_else', isActive: true, settings: null, theme: null });
    const res = await request(app)
      .post('/api/products/bulk-preview')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: GOOD_FILE });
    expect(res.status).toBe(403);
  });
});
