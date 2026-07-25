import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } });
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) { next(error); }
});

notificationsRouter.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
});

notificationsRouter.put('/read-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) { next(error); }
});