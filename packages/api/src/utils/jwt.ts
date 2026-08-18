import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const JWT_SECRET = env.JWT_SECRET;
export const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

const ACCESS_TTL: jwt.SignOptions['expiresIn'] = (env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn']) || '2h';

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