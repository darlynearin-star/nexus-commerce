import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { sendEmail, isEmailConfigured } from '../utils/email';
import { logActivity } from '../utils/activity-log';

export const supportRouter = Router();
export const supportAdminRouter = Router();

const STATUSES = new Set(['OPEN', 'RESOLVED', 'CLOSED']);

// Any signed-in user (shopper, retailer, developer) can open a ticket. The
// schema keys tickets to a Customer row, so guarantee one exists per User.
async function customerFor(userId: string) {
  return prisma.customer.upsert({ where: { userId }, update: {}, create: { userId } });
}

async function devTeam() {
  return prisma.user.findMany({
    where: { role: { in: ['DEVELOPER', 'SUPER_DEVELOPER'] } as any },
    select: { id: true, email: true },
  });
}

async function notifyDevTeam(ticket: { subject: string; description: string }, actorId: string) {
  const devs = await devTeam();
  if (!devs.length) return;
  const pre = ticket.subject.slice(0, 60);
  await prisma.notification.createMany({
    data: devs
      .filter((d) => d.id !== actorId)
      .map((d) => ({
        userId: d.id,
        type: 'ADMIN_ANNOUNCEMENT' as any,
        channel: 'IN_APP' as any,
        title: 'New support ticket',
        message: pre,
        data: { kind: 'support:new' },
      })),
  });
  if (await isEmailConfigured()) {
    await Promise.allSettled(
      devs
        .filter((d) => d.id !== actorId)
        .map((d) =>
          sendEmail({
            to: d.email,
            subject: `[Lyn-nyx Support] ${ticket.subject}`,
            text: ticket.description,
            html: `<div style="font-family:Inter,Arial,sans-serif;color:#111827"><h2>New support ticket</h2><p><strong>${escapeHtml(ticket.subject)}</strong></p><p style="white-space:pre-wrap">${escapeHtml(ticket.description)}</p><p style="color:#6b7280;font-size:13px">Reply from the Support Inbox in the developer dashboard.</p></div>`,
          }),
        ),
    );
  }
}

async function notifyCustomer(userId: string, ticketId: string, preview: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'ADMIN_ANNOUNCEMENT' as any,
      channel: 'IN_APP' as any,
      title: 'New reply on your ticket',
      message: preview.slice(0, 80),
      data: { kind: 'support:reply', ticketId },
    },
  });
  const { user } = await prisma.customer.findUniqueOrThrow({ where: { userId }, select: { user: { select: { email: true, firstName: true } } } });
  if (await isEmailConfigured()) {
    await sendEmail({
      to: user.email,
      subject: 'You have a new reply from Lyn-nyx support',
      text: preview,
      html: `<div style="font-family:Inter,Arial,sans-serif;color:#111827"><h2>New reply on your ticket</h2><p>${escapeHtml(preview)}</p></div>`,
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

async function hydrateTickets(tickets: any[]) {
  const userIds = Array.from(new Set(tickets.flatMap((t) => t.messages.map((m: any) => m.userId))));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } as any }, select: { id: true, firstName: true, lastName: true, role: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  return tickets.map(({ messages, ...t }) => ({
    ...t,
    messages: messages.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      message: m.message,
      createdAt: m.createdAt,
      sender: byId.get(m.userId) ? `${byId.get(m.userId)!.firstName} ${byId.get(m.userId)!.lastName}` : 'Support',
      role: byId.get(m.userId)?.role || 'GUEST',
    })),
  }));
}

// ---- Customer-facing (storefront) ----

supportRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const customer = await customerFor(req.user!.userId);
    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ success: true, data: await hydrateTickets(tickets) });
  } catch (error) { next(error); }
});

supportRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const description = String(req.body.description || '').trim();
    if (!subject) return res.status(400).json({ success: false, error: 'A short subject is required' });
    if (subject.length > 120) return res.status(400).json({ success: false, error: 'Subject must be 120 characters or fewer' });
    if (!description) return res.status(400).json({ success: false, error: 'Please describe what is happening' });
    if (description.length > 5000) return res.status(400).json({ success: false, error: 'Message must be 5000 characters or fewer' });

    const customer = await customerFor(req.user!.userId);
    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: customer.id,
        subject,
        description,
        status: 'OPEN',
        messages: { create: { userId: req.user!.userId, message: description } },
      },
      include: { messages: true },
    });
    logActivity({ userId: req.user!.userId, action: 'support:ticket', resource: 'support', details: { ticketId: ticket.id, subject }, req: req as any });
    await notifyDevTeam(ticket, req.user!.userId);
    res.status(201).json({ success: true, data: (await hydrateTickets([ticket]))[0] });
  } catch (error) { next(error); }
});

supportRouter.post('/:id/messages', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    if (message.length > 5000) return res.status(400).json({ success: false, error: 'Message must be 5000 characters or fewer' });

    const customer = await customerFor(req.user!.userId);
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, customerId: customer.id } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const created = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, userId: req.user!.userId, message },
    });
    await notifyDevTeam({ subject: `Re: ${ticket.subject}`, description: message }, req.user!.userId);
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
});

// ---- Developer dashboard (Support Inbox) ----

supportAdminRouter.use(authenticate, requirePermission(Permission.MANAGE_SYSTEM));

supportAdminRouter.get('/tickets', async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && STATUSES.has(String(status))) where.status = String(status);
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ success: true, data: await hydrateTickets(tickets) });
  } catch (error) { next(error); }
});

supportAdminRouter.get('/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, data: (await hydrateTickets([ticket]))[0] });
  } catch (error) { next(error); }
});

supportAdminRouter.post('/tickets/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    if (message.length > 5000) return res.status(400).json({ success: false, error: 'Message must be 5000 characters or fewer' });

    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id }, include: { customer: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const created = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, userId: req.user!.userId, message },
    });
    logActivity({ userId: req.user!.userId, action: 'support:reply', resource: 'support', details: { ticketId: ticket.id }, req: req as any });
    await notifyCustomer(ticket.customer.userId, ticket.id, message);
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
});

function updateTicketStatus(req: AuthRequest, res: any, next: any) {
  (async () => {
    try {
      const status = String(req.body.status || '').toUpperCase();
      if (!STATUSES.has(status)) return res.status(400).json({ success: false, error: 'Status must be OPEN, RESOLVED or CLOSED' });
      const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
      const updated = await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status } });
      logActivity({ userId: req.user!.userId, action: 'support:status', resource: 'support', details: { ticketId: ticket.id, status }, req: req as any });
      res.json({ success: true, data: updated });
    } catch (error) { next(error); }
  })();
}

supportAdminRouter.patch('/tickets/:id', updateTicketStatus);
supportAdminRouter.put('/tickets/:id', updateTicketStatus);