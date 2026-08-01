import prisma from '@nexus/database';
import { Request, Response, NextFunction } from 'express';

export async function checkKillSwitch(req: Request, res: Response, next: NextFunction) {
  try {
    const killSwitch = await prisma.killSwitch.findFirst();
    if (!killSwitch) return next();

    if (killSwitch.apis) {
      return res.status(503).json({
        success: false,
        error: killSwitch.maintenanceMessage || 'Service temporarily unavailable',
        maintenance: true,
      });
    }

    if (killSwitch.maintenance && !req.path.startsWith('/api/auth')) {
      return res.status(503).json({
        success: false,
        error: killSwitch.maintenanceMessage || 'We are currently undergoing maintenance.',
        maintenance: true,
      });
    }

    if (killSwitch.retailerDashboard && req.path.startsWith('/api/stores/mine')) {
      return res.status(503).json({ success: false, error: 'Retailer dashboard is disabled.', maintenance: true });
    }

    if (killSwitch.customerRegistration && req.method === 'POST' && req.path.startsWith('/api/auth/register')) {
      return res.status(503).json({ success: false, error: 'Customer registration is disabled.', maintenance: true });
    }

    if (killSwitch.orders && req.path.startsWith('/api/orders')) {
      return res.status(503).json({ success: false, error: 'Order processing is disabled.', maintenance: true });
    }

    if (killSwitch.storefront && req.path.startsWith('/api/products')) {
      return res.status(503).json({ success: false, error: 'Storefront is disabled.', maintenance: true });
    }

    if (killSwitch.checkout && (req.path.startsWith('/api/orders') || req.path.startsWith('/api/cart'))) {
      return res.status(503).json({ success: false, error: 'Checkout is disabled.', maintenance: true });
    }

    if (killSwitch.search && req.path.startsWith('/api/search')) {
      return res.status(503).json({ success: false, error: 'Search is disabled.', maintenance: true });
    }

    if (killSwitch.uploads && (req.method === 'POST' || req.method === 'PUT') && req.path.startsWith('/api/media')) {
      return res.status(503).json({ success: false, error: 'Uploads are disabled.', maintenance: true });
    }

    next();
  } catch {
    next();
  }
}