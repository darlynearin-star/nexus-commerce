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

const JWT_SECRET = 'test-secret-for-unit-tests-0123456789';
process.env.JWT_SECRET = JWT_SECRET;

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();

const TICKET = {
  id: 't1',
  customerId: 'c1',
  subject: '[Bug] Checkout crashes',
  description: 'It broke',
  status: 'OPEN',
  priority: 'NORMAL',
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [{ id: 'm1', ticketId: 't1', userId: 'u_customer', message: 'It broke', createdAt: new Date() }],
  customer: { user: { firstName: 'Ann', lastName: 'On', email: 'ann@example.com' } },
};

function customerToken() {
  return jwt.sign({ userId: 'u_customer', email: 'ann@example.com', role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '2h' });
}
function devToken() {
  return jwt.sign({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' }, JWT_SECRET, { expiresIn: '2h' });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.setting.findUnique.mockResolvedValue(null);
  // Authenticated-user lookup (auth cache misses)
  prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
    if (where?.id === 'u_customer') return Promise.resolve({ id: 'u_customer', role: 'CUSTOMER', isActive: true });
    if (where?.id === 'u_dev') return Promise.resolve({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
    return Promise.resolve(null);
  });
  // Widget hydration of message senders
  prismaMock.user.findMany.mockImplementation(({ where }: any) => {
    if (where?.role) return Promise.resolve([{ id: 'u_dev', email: 'dev@example.com' }]);
    return Promise.resolve([{ id: 'u_customer', firstName: 'Ann', lastName: 'On', role: 'CUSTOMER' }]);
  });
  prismaMock.customer.upsert.mockImplementation(({ where }: any) =>
    Promise.resolve({ id: where?.userId === 'u_customer' ? 'c1' : 'c_other', userId: where?.userId }),
  );
  prismaMock.activityLog.create.mockResolvedValue({ id: 'l1' });
  prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
  prismaMock.notification.create.mockResolvedValue({ id: 'n1' });
  prismaMock.ticketMessage.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'm_' + data.userId, ticketId: data.ticketId, userId: data.userId, message: data.message, createdAt: new Date() }),
  );
  prismaMock.customer.findUniqueOrThrow.mockResolvedValue({ user: { email: 'ann@example.com', firstName: 'Ann' } });
});

describe('I13: support tickets (storefront + developer inbox)', () => {
  it('requires a session to create a ticket', async () => {
    const res = await request(app).post('/api/support').send({ subject: 'Hi', description: 'Broken' });
    expect(res.status).toBe(401);
  });

  it('creates a ticket + first message and notifies the dev team', async () => {
    prismaMock.supportTicket.create.mockImplementation(({ data }: any) => {
      const msg = data.messages.create;
      return Promise.resolve({
        ...TICKET,
        subject: data.subject,
        description: data.description,
        messages: [{ id: 'm1', ticketId: 't1', userId: msg.userId, message: msg.message, createdAt: new Date() }],
      });
    });
    const res = await request(app).post('/api/support').set('Authorization', `Bearer ${customerToken()}`).send({ subject: '[Bug] Checkout crashes', description: 'It broke' });
    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBe('[Bug] Checkout crashes');
    expect(prismaMock.supportTicket.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
  });

  it('rejects empty subject or description', async () => {
    const res = await request(app).post('/api/support').set('Authorization', `Bearer ${customerToken()}`).send({ subject: '', description: 'x' });
    expect(res.status).toBe(400);
    const res2 = await request(app).post('/api/support').set('Authorization', `Bearer ${customerToken()}`).send({ subject: 'x', description: '' });
    expect(res2.status).toBe(400);
  });

  it('lists only the signed-in user’s tickets', async () => {
    prismaMock.supportTicket.findMany.mockResolvedValue([TICKET]);
    const res = await request(app).get('/api/support').set('Authorization', `Bearer ${customerToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].messages[0].sender).toContain('Ann');
    expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: 'c1' } }));
  });

  it('blocks adding a message to someone else’s ticket', async () => {
    prismaMock.supportTicket.findFirst.mockResolvedValue(undefined);
    const res = await request(app).post('/api/support/t1/messages').set('Authorization', `Bearer ${customerToken()}`).send({ message: 'mine?' });
    expect(res.status).toBe(404);
  });

  it('lets the owner add a follow-up message', async () => {
    prismaMock.supportTicket.findFirst.mockResolvedValue(TICKET);
    const res = await request(app).post('/api/support/t1/messages').set('Authorization', `Bearer ${customerToken()}`).send({ message: 'Actually it fixed itself' });
    expect(res.status).toBe(201);
    expect(prismaMock.ticketMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u_customer', message: 'Actually it fixed itself' }) }));
  });

  it('developer admin can list, reply to and close tickets; customers cannot', async () => {
    prismaMock.supportTicket.findMany.mockResolvedValue([TICKET]);
    prismaMock.supportTicket.findUnique.mockResolvedValue(TICKET);

    const denied = await request(app).get('/api/admin/support/tickets').set('Authorization', `Bearer ${customerToken()}`);
    expect(denied.status).toBe(403);

    const list = await request(app).get('/api/admin/support/tickets').set('Authorization', `Bearer ${devToken()}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const reply = await request(app).post('/api/admin/support/tickets/t1/messages').set('Authorization', `Bearer ${devToken()}`).send({ message: 'We fixed it, thanks' });
    expect(reply.status).toBe(201);
    expect(prismaMock.ticketMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u_dev' }) }));
    expect(prismaMock.notification.create).toHaveBeenCalled();

    prismaMock.supportTicket.update.mockResolvedValue({ ...TICKET, status: 'RESOLVED' });
    const close = await request(app).patch('/api/admin/support/tickets/t1').set('Authorization', `Bearer ${devToken()}`).send({ status: 'RESOLVED' });
    expect(close.status).toBe(200);
    expect(close.body.data.status).toBe('RESOLVED');
  });

  it('rejects an invalid status', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(TICKET);
    const res = await request(app).patch('/api/admin/support/tickets/t1').set('Authorization', `Bearer ${devToken()}`).send({ status: 'WEIRD' });
    expect(res.status).toBe(400);
  });
});