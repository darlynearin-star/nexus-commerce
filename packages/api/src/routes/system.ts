import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';

export const systemRouter = Router();

systemRouter.get('/health', authenticate, async (req, res, next) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        cpu: { usage: (cpuUsage.user + cpuUsage.system) / 1000000, cores: 1 },
        memory: { total: 0, used: memUsage.heapUsed, free: 0, usagePercent: memUsage.heapUsed / memUsage.heapTotal * 100 },
        database: { status: 'connected', latency: dbLatency },
        api: { uptime: process.uptime() },
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.json({ success: true, data: { status: 'degraded', database: { status: 'error' }, lastChecked: new Date().toISOString() } });
  }
});

systemRouter.get('/feature-flags', authenticate, async (req, res, next) => {
  try {
    const flags = await prisma.featureFlag.findMany();
    res.json({ success: true, data: flags });
  } catch (error) { next(error); }
});

systemRouter.put('/feature-flags/:key', authenticate, requirePermission(Permission.MANAGE_SYSTEM), async (req, res, next) => {
  try {
    const flag = await prisma.featureFlag.update({ where: { key: req.params.key }, data: { enabled: req.body.enabled } });
    res.json({ success: true, data: flag });
  } catch (error) { next(error); }
});