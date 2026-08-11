import { PrismaClient } from '@prisma/client';

const primaryUrl: string = process.env.DATABASE_URL || '';
const fallbackUrl: string = process.env.DATABASE_URL_FALLBACK || '';

function buildClient(url: string): PrismaClient {
  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

let client: PrismaClient = buildClient(primaryUrl);
let activeUrl: string = primaryUrl;
let usingFallback = false;
let switchInProgress: Promise<void> | null = null;

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '');
  const message = `${String(err?.message || '')} ${String(err?.meta?.database_error || '')}`;
  const codes = new Set(['P1001', 'P1002', 'P1003', 'P1009', 'P1017', 'P2024']);
  if (codes.has(code)) return true;
  return /(can'?t reach database server|connection refused|econnrefused|econnreset|etimedout|host not reachable|connect timeout|terminat.*connection|does not exist|too many clients)/i.test(message);
}

async function switchToFallback(): Promise<boolean> {
  if (!fallbackUrl || usingFallback) return usingFallback;
  if (switchInProgress) {
    await switchInProgress;
    return usingFallback;
  }
  switchInProgress = (async () => {
    const fb = buildClient(fallbackUrl);
    try {
      await fb.$connect();
      await fb.$queryRaw`SELECT 1`;
      const old = client;
      client = fb;
      activeUrl = fallbackUrl;
      usingFallback = true;
      await old.$disconnect().catch(() => {});
      console.error('[database] PRIMARY DATABASE UNREACHABLE - switched to FALLBACK database');
    } catch (e: any) {
      await fb.$disconnect().catch(() => {});
      console.error(`[database] Fallback database also unreachable: ${e?.message || e}`);
    }
  })();
  try {
    await switchInProgress;
  } finally {
    switchInProgress = null;
  }
  return usingFallback;
}

export async function initDatabase(): Promise<void> {
  if (usingFallback || !primaryUrl) return;
  try {
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
  } catch {
    await switchToFallback();
  }
}

export function getDbStatus() {
  return { activeUrl, usingFallback };
}

function makeDelegate(prop: string): any {
  return new Proxy({} as any, {
    get(_target, methodName: PropertyKey) {
      if (typeof methodName === 'symbol') {
        const delegate = (client as any)[prop];
        const v = delegate?.[methodName];
        return typeof v === 'function' ? v.bind(delegate) : v;
      }
      const delegate = (client as any)[prop];
      if (!delegate || typeof delegate !== 'object') return delegate;
      const value = delegate[methodName];
      if (typeof value === 'function') {
        return async (...args: any[]) => {
          const attempt = () => (client as any)[prop][methodName](...args);
          try {
            return await attempt();
          } catch (e: any) {
            if (!usingFallback && fallbackUrl && isConnectionError(e)) {
              if (await switchToFallback()) return await attempt();
            }
            throw e;
          }
        };
      }
      return value;
    },
  });
}

const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: PropertyKey) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return (client as any)[prop];
    if (String(prop).startsWith('_')) return (client as any)[prop];

    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return async (...args: any[]) => {
        const attempt = () => (client as any)[prop].apply(client, args);
        try {
          return await attempt();
        } catch (e: any) {
          if (!usingFallback && fallbackUrl && isConnectionError(e)) {
            if (await switchToFallback()) return await attempt();
          }
          throw e;
        }
      };
    }
    if (value && typeof value === 'object') return makeDelegate(String(prop));
    return value;
  },
});

export { PrismaClient } from '@prisma/client';
export default prisma;
export { jijiCategories } from './jiji-categories';
export type { JijiCategory } from './jiji-categories';
export type { PrismaClient as PrismaClientType } from '@prisma/client';