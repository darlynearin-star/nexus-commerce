import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidateStore, cacheClear, cacheStats } from './cache';

describe('TTL cache', () => {
  beforeEach(() => {
    cacheClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and returns a value within TTL', () => {
    cacheSet('products:adorn:list:1', { data: [1, 2, 3] });
    expect(cacheGet('products:adorn:list:1')).toEqual({ data: [1, 2, 3] });
  });

  it('expires entries after the TTL', () => {
    cacheSet('k', 'v', 1000);
    vi.advanceTimersByTime(1001);
    expect(cacheGet('k')).toBeNull();
  });

  it('invalidates an exact key', () => {
    cacheSet('stores:public', 'x');
    cacheInvalidate('stores:public');
    expect(cacheGet('stores:public')).toBeNull();
  });

  it('invalidates all keys sharing a prefix', () => {
    cacheSet('products:adorn:list:1', 'a');
    cacheSet('products:adorn:list:2', 'b');
    cacheSet('products:adorn:featured', 'c');
    cacheSet('products:other:list:1', 'd');
    cacheInvalidate('products:adorn');
    expect(cacheGet('products:adorn:list:1')).toBeNull();
    expect(cacheGet('products:adorn:list:2')).toBeNull();
    expect(cacheGet('products:adorn:featured')).toBeNull();
    expect(cacheGet('products:other:list:1')).toEqual('d');
  });

  it('cacheInvalidateStore clears product and store keys for a slug', () => {
    cacheSet('products:adorn:list:1', 'a');
    cacheSet('stores:adorn', 's');
    cacheInvalidateStore('adorn');
    expect(cacheStats().size).toBe(0);
  });
});