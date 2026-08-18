// Lightweight in-memory TTL cache for high-frequency public reads.
// Single-process (Render free tier) so a module-level Map is safe.

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 500;

export function cacheGet<T = any>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: any, ttlMs: number = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Invalidate a key or all keys sharing a prefix (e.g. store slug).
export function cacheInvalidate(keyPrefix: string): void {
  if (store.has(keyPrefix)) {
    store.delete(keyPrefix);
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}

export function cacheClear(): void {
  store.clear();
}

// Invalidate all keys for a store (products/storefront reads).
export function cacheInvalidateStore(storeSlug: string): void {
  cacheInvalidate(`products:${storeSlug}`);
  cacheInvalidate(`stores:${storeSlug}`);
}

export function cacheStats() {
  return { size: store.size };
}