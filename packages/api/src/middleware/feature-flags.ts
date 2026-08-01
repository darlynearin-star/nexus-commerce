import { Request, Response, NextFunction } from 'express';
import prisma from '@nexus/database';

export function requireFeatureEnabled(featureKey: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } });
      if (!flag || !flag.enabled) {
        return res.status(403).json({ success: false, error: `Feature '${featureKey}' is currently disabled` });
      }
      next();
    } catch (error) { next(error); }
  };
}
