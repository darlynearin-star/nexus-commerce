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

  it('rejects unauthenticated preview and import', async () => {
    const preview = await request(app).post('/api/products/bulk-preview').set('x-store-slug', 'adorn').send({ content: GOOD_FILE });
    const importRes = await request(app).post('/api/products/bulk-import').set('x-store-slug', 'adorn').send({ content: GOOD_FILE });
    expect(preview.status).toBe(401);
    expect(importRes.status).toBe(401);
  });

  it('treats category paths like "Women > Dresses" as their leaf (existing)', async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: 'cat_D', name: 'Dresses', slug: 'dresses' }]);
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));

    const path = '---\nname: Print Dress\nprice: 45000\ncategory: Women > Dresses\n';
    const preview = await request(app)
      .post('/api/products/bulk-preview')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: path });
    const row = preview.body.data.rows[0];
    expect(row.category).toBe('Women > Dresses');
    expect(row.categoryAction).toBe('existing');

    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: path });
    expect(res.status).toBe(200);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
    expect(prismaMock.product.create.mock.calls[0][0].data.categoryId).toBe('cat_D');
  });

  it('auto-created categories use the leaf name, not the full path', async () => {
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.category.create.mockResolvedValue({ id: 'cat_NEW', name: 'Dresses', slug: 'dresses-ab12' });
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));

    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: '---\nname: Print Dress\nprice: 45000\ncategory: Women > Dresses\n' });

    expect(res.status).toBe(200);
    expect(res.body.data.newCategories).toEqual(['Dresses']);
    const catCreate = prismaMock.category.create.mock.calls[0][0].data;
    expect(catCreate.name).toBe('Dresses');
    expect(catCreate.storeId).toBe('store_1');
    expect(prismaMock.product.create.mock.calls[0][0].data.categoryId).toBe('cat_NEW');
  });

  it('maps every supported field through to the product row', async () => {
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.category.create.mockResolvedValue({ id: 'c1', name: 'Trousers', slug: 'trousers-a1b2' });
    prismaMock.product.create.mockImplementation(async ({ data }: any) => ({ id: `p-${data.name}`, ...data }));

    const rich = `--- 
name: Cotton Trousers
price: 45,000
compare_at_price: 60000
cost_per_item: 28000
stock: 12
low_stock_threshold: 3
brand: Adorn
sku: TRS-001
tags: cotton, trousers, casual
track_inventory: no
allow_backorder: yes
warranty: 6 months
return_policy: |
  Return within 14 days if unworn.
seo_title: Best Trousers
seo_description: Casual cotton trousers
category: Men > Trousers
description: |
  Line one.

  Line three.
features: |
  Cotton
  Breathable
specs: |
  Material: Cotton
  Fit: Slim
`;
    const res = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: rich });

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    const d = prismaMock.product.create.mock.calls[0][0].data;
    expect(d.price).toBe(45000);             // comma stripped
    expect(d.compareAtPrice).toBe(60000);
    expect(d.costPerItem).toBe(28000);
    expect(d.stock).toBe(12);
    expect(d.lowStockThreshold).toBe(3);
    expect(d.brand).toBe('Adorn');
    expect(d.sku).toBe('TRS-001');
    expect(d.tags).toEqual(['cotton', 'trousers', 'casual']);
    expect(d.trackInventory).toBe(false);
    expect(d.allowBackorder).toBe(true);
    expect(d.warranty).toBe('6 months');
    expect(d.returnPolicy).toBe('Return within 14 days if unworn.');
    expect(d.seoTitle).toBe('Best Trousers');
    expect(d.seoDescription).toBe('Casual cotton trousers');
    expect(d.description).toBe('Line one.\n\nLine three.');
    expect(d.features).toEqual(['Cotton', 'Breathable']);
    expect(d.specifications).toEqual({ Material: 'Cotton', Fit: 'Slim' });
    expect(d.categoryId).toBe('c1');
  });

  it('rejects files over the 100-product cap at the route', async () => {
    const over = Array.from({ length: 101 }, (_, i) => `---\nname: P${i}\nprice: ${i + 1}`).join('\n');
    const preview = await request(app)
      .post('/api/products/bulk-preview')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: over });
    // Preview is non-fatal by design: it surfaces issues so the merchant can fix them.
    expect(preview.status).toBe(200);
    expect(preview.body.data.fileIssues.some((i: any) => /maximum is/.test(i.message))).toBe(true);

    const importRes = await request(app)
      .post('/api/products/bulk-import')
      .set('Authorization', `Bearer ${retailerToken()}`)
      .set('x-store-slug', 'adorn')
      .send({ content: over });
    expect(importRes.status).toBe(400);
  });
});
