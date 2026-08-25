import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';
import { invalidateKillSwitchCache } from '../middleware/kill-switch';

export const killSwitchRouter = Router();

killSwitchRouter.get('/', authenticate, requirePermission(Permission.MANAGE_KILL_SWITCH), async (req, res, next) => {
  try {
    const state = await prisma.killSwitch.findFirst();
    res.json({ success: true, data: state });
  } catch (error) { next(error); }
});

killSwitchRouter.put('/', authenticate, requirePermission(Permission.MANAGE_KILL_SWITCH), async (req: AuthRequest, res, next) => {
  try {
    const { storefront, retailerDashboard, customerRegistration, checkout, orders, uploads, payments, apis, search, maintenance, maintenanceMessage } = req.body;
    const state = await prisma.killSwitch.updateMany({
      data: { storefront, retailerDashboard, customerRegistration, checkout, orders, uploads, payments, apis, search, maintenance, maintenanceMessage, updatedBy: req.user!.email, updatedAt: new Date() },
    });
    logActivity({
      userId: req.user!.userId,
      action: Object.values(req.body).some(v => v === true) ? 'kill_switch:activated' : 'kill_switch:deactivated',
      resource: 'kill_switch',
      details: req.body,
      req: req as any,
    });
    // Emergency lever must take effect immediately, not on the next cache tick.
    invalidateKillSwitchCache();
    res.json({ success: true, message: 'Kill switch updated' });
  } catch (error) { next(error); }
});