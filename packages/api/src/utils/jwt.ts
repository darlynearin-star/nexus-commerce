import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function stableSecret(prefix: string, secret?: string): string {
  // Prefer the configured env value. Fall back to a stable, derived secret so a
  // redeploy without env vars never invalidates all existing sessions.
  if (secret) return secret;
  return crypto.createHash('sha256').update('lyn-nxy-stores:' + prefix).digest('hex');
}

export const JWT_SECRET = stableSecret('access', process.env.JWT_SECRET);
export const JWT_REFRESH_SECRET = stableSecret('refresh', process.env.JWT_REFRESH_SECRET);

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

const ACCESS_TTL: jwt.SignOptions['expiresIn'] = (process.env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn']) || '2h';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}