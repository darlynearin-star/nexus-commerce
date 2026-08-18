import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error:', err);

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'A record with this value already exists.', requestId: res.getHeader('X-Request-Id') });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record not found.', requestId: res.getHeader('X-Request-Id') });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : message,
    requestId: res.getHeader('X-Request-Id'),
  });
}