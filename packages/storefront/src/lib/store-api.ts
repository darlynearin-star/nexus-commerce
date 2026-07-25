'use client';
import { apiClient } from './api';

let _storeSlug: string | null = null;

export function setStoreSlug(slug: string | null) {
  _storeSlug = slug;
}

export function getStoreSlug() {
  return _storeSlug;
}

async function storeApiClient<T = any>(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (_storeSlug) headers['x-store-slug'] = _storeSlug;
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
