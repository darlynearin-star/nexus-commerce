import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { requireFeatureEnabled } from '../middleware/feature-flags';

export const wishlistRouter = Router();
wishlistRouter.use(requireStore);

wishlistRouter.get('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
    const wishlists = await prisma.wishlist.findMany({ where: { customerId: customer?.id, storeId: req.storeId! }, include: { items: { include: { product: { include: { category: true } } } } } });
    res.json({ success: true, data: wishlists });
  } catch (error) { next(error); }
});

wishlistRouter.post('/add', authenticate, requireFeatureEnabled('wishlist'), async (req: StoreRequest, res, next) => {
  try {
    const { productId } = req.body;
    const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
    if (!customer) return res.status(400).json({ success: false, error: 'Customer not found' });

    let wishlist = await prisma.wishlist.findFirst({ where: { customerId: customer.id, storeId: req.storeId! } });
    if (!wishlist) wishlist = await prisma.wishlist.create({ data: { storeId: req.storeId!, customerId: customer.id } });

    const exists = await prisma.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wishlist.id, productId } } });
    if (exists) return res.status(409).json({ success: false, error: 'Product already in wishlist' });

    await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (error) { next(error); }
});

wishlistRouter.delete('/item/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.wishlistItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) { next(error); }
});

// Remove by productId within the caller's own wishlist for the current store.
// Used by card/product "heart" remove toggles.
wishlistRouter.post('/remove', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { productId } = req.body;
    const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
    if (!customer) return res.status(400).json({ success: false, error: 'Customer not found' });
    await prisma.wishlistItem.deleteMany({
      where: { productId, wishlist: { customerId: customer.id, storeId: req.storeId! } },
    });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) { next(error); }
});
