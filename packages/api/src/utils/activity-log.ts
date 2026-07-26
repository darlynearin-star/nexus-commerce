import prisma from '@nexus/database';
import { ActivityAction } from '@nexus/shared';
import { Request } from 'express';

export async function logActivity(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  req?: Request;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || '',
        details: params.details || {},
        ipAddress: params.req?.ip || '',
        userAgent: params.req?.headers['user-agent'] || '',
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}