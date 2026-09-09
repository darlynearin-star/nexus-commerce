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
// Manual mode: never auto-switch on failures; switching is driven by the dashboard.
const manualSwitch: boolean = process.env.DB_MANUAL_SWITCH !== 'false';

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '');
  const message = `${String(err?.message || '')} ${String(err?.meta?.database_error || '')}`;
  const codes = new Set(['P1001', 'P1002', 'P1003', 'P1008', 'P1009', 'P1017', 'P2024']);
  if (codes.has(code)) return true;
  return /(can'?t reach database server|connection refused|econnrefused|econnreset|etimedout|host not reachable|connect timeout|terminat.*connection|does not exist|too many clients)/i.test(message);
}

const MAX_TRANSIENT_RETRIES = 2;
const RETRY_DELAY_MS = [150, 500];
// Errors that guarantee the operation never reached the server. Safe to retry
// for BOTH reads and writes. Everything else (mid-query drops) may have
// committed on the DB, so only reads get retried on it.
const SAFE_RETRY_CODES = new Set(['P1001', 'P1002', 'P1009', 'P1017', 'P2024']);
const SAFE_RETRY_MESSAGE = /(can'?t reach database server|connection refused|too many clients|connection pool|pool timeout|timed out fetching a new connection)/i;
const RETRYABLE_READ_METHODS = new Set([
  'findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy', 'findRaw', 'aggregateRaw',
  '$queryRaw', '$queryRawUnsafe', '$queryRawTyped',
]);

function isSafeRetryError(e: any): boolean {
  const code = String(e?.code || '');
  const message = `${String(e?.message || '')} ${String(e?.meta?.database_error || '')}`;
  return SAFE_RETRY_CODES.has(code) || SAFE_RETRY_MESSAGE.test(message);
}

// Transient DB blips (pool timeouts, "can't reach database server") are the
// norm on hosted Postgres — retry them briefly instead of failing the request.
// Writes are retried only when the op provably never reached the database.
async function withTransientRetry<T>(method: string, fn: () => Promise<T>): Promise<T> {
  const isRead = RETRYABLE_READ_METHODS.has(method);
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!isConnectionError(e)) throw e;
      if (!isRead && !isSafeRetryError(e)) throw e;
      if (attempt === MAX_TRANSIENT_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt] ?? 500));
    }
  }
  throw lastErr;
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
  } catch (e: any) {
    if (manualSwitch) {
      console.error(`[database] PRIMARY database unreachable at boot (${e?.message || e}). Manual switch mode: staying on primary - switch via the dashboard.`);
      return;
    }
    await switchToFallback();
  }
}

export function getDbStatus() {
  return { activeUrl, usingFallback, manualSwitch };
}

export function isManualSwitch(): boolean {
  return manualSwitch;
}

export async function switchDatabase(target: 'primary' | 'fallback'): Promise<{ ok: boolean; usingFallback: boolean; error?: string }> {
  const url = target === 'fallback' ? fallbackUrl : primaryUrl;
  if (!url) return { ok: false, usingFallback, error: `${target} database URL not configured` };
  if (target === 'fallback' && usingFallback) return { ok: true, usingFallback };
  if (target === 'primary' && !usingFallback) return { ok: true, usingFallback };

  const candidate = buildClient(url);
  try {
    await candidate.$connect();
    await candidate.$queryRaw`SELECT 1`;
    const old = client;
    client = candidate;
    activeUrl = url;
    usingFallback = target === 'fallback';
    await old.$disconnect().catch(() => {});
    console.error(`[database] switched to ${target} database`);
    return { ok: true, usingFallback };
  } catch (e: any) {
    await candidate.$disconnect().catch(() => {});
    return { ok: false, usingFallback, error: e?.message || String(e) };
  }
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
        return (...args: any[]) => withTransientRetry(String(methodName), async () => {
          const attempt = () => (client as any)[prop][methodName](...args);
          try {
            return await attempt();
          } catch (e: any) {
            if (!manualSwitch && !usingFallback && fallbackUrl && isConnectionError(e)) {
              if (await switchToFallback()) return await attempt();
            }
            throw e;
          }
        });
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
      return (...args: any[]) => withTransientRetry(String(prop), async () => {
        const attempt = () => (client as any)[prop].apply(client, args);
        try {
          return await attempt();
        } catch (e: any) {
          if (!manualSwitch && !usingFallback && fallbackUrl && isConnectionError(e)) {
            if (await switchToFallback()) return await attempt();
          }
          throw e;
        }
      });
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