'use client';
import { getActiveStoreSlug } from '@nexus/web';
import { apiClient } from './api';

let _storeSlug: string | null = null;

const SESSION_KEY = 'nexusSessionId';

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function setStoreSlug(slug: string | null) {
  _storeSlug = slug;
}

export function getStoreSlug() {
  return _storeSlug;
}

async function storeApiClient<T = any>(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  const slug = _storeSlug || getActiveStoreSlug();
  if (slug) headers['x-store-slug'] = slug;
  const sid = getSessionId();
  if (sid) headers['x-session-id'] = sid;
  return apiClient<T>(endpoint, { ...options, headers });
}

export const storeApi = {
  get: <T = any>(endpoint: string, params?: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) searchParams.set(k, String(v)); });
    const qs = searchParams.toString();
    return storeApiClient<T>(`${endpoint}${qs ? `?${qs}` : ''}`);
  },
  post: <T = any>(endpoint: string, data?: any) => storeApiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T = any>(endpoint: string, data?: any) => storeApiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T = any>(endpoint: string) => storeApiClient<T>(endpoint, { method: 'DELETE' }),
};