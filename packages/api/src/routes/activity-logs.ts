import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';

export const activityLogsRouter = Router();

activityLogsRouter.get('/', authenticate, requirePermission(Permission.VIEW_LOGS), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const action = req.query.action as string;
    const userId = req.query.userId as string;

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ success: true, data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});