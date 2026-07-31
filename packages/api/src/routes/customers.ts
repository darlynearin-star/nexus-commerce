import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const customersRouter = Router();
customersRouter.use(requireStore);

customersRouter.get('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const search = req.query.search as string;

    const storeId = req.storeId!;
    const where: any = { orders: { some: { storeId } } };
    if (search) {
      where.AND = [{ orders: { some: { storeId } } }, { OR: [{ user: { email: { contains: search, mode: 'insensitive' } } }, { user: { firstName: { contains: search, mode: 'insensitive' } } }, { user: { lastName: { contains: search, mode: 'insensitive' } } }] }];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, include: { user: true, addresses: true, orders: { where: { storeId }, take: 5, orderBy: { createdAt: 'desc' } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);
    res.json({ success: true, data: customers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

customersRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.userId },
      include: { user: true, addresses: true, wishlists: { include: { items: { include: { product: true } } } } },
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

customersRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, include: { user: true, addresses: true, orders: { take: 20, orderBy: { createdAt: 'desc' } } } });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});