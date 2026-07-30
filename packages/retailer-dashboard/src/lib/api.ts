const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${API_BASE}/api${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  const token = getToken();
  const storeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (storeSlug) headers['x-store-slug'] = storeSlug;

  const res = await fetch(url, { ...fetchOptions, headers });
  if (res.status === 401 && getRefreshToken()) {
    const refreshToken = getRefreshToken();
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      localStorage.setItem('accessToken', refreshData.data.accessToken);
      headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
      const retryRes = await fetch(url, { ...fetchOptions, headers });
      if (!retryRes.ok) throw new ApiError(retryRes.status, (await retryRes.json().catch(() => ({ error: 'Failed' }))).error);
      return retryRes.json();
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({ error: 'Failed' }))).error);
  return res.json();
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, string | number | undefined>) => apiClient<T>(endpoint, { params }),
  post: <T = any>(endpoint: string, data?: any) => apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T = any>(endpoint: string, data?: any) => apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T = any>(endpoint: string) => apiClient<T>(endpoint, { method: 'DELETE' }),
  upload: async <T = any>(endpoint: string, formData: FormData): Promise<T> => {
    const url = `${API_BASE}/api${endpoint}`;
    const token = getToken();
    const storeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (storeSlug) headers['x-store-slug'] = storeSlug;
    const res = await fetch(url, { method: 'POST', headers, body: formData });
    if (res.status === 401 && getRefreshToken()) {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        const retryRes = await fetch(url, { method: 'POST', headers, body: formData });
        if (!retryRes.ok) throw new ApiError(retryRes.status, (await retryRes.json().catch(() => ({ error: 'Upload failed' }))).error);
        return retryRes.json();
      }
    }
    if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({ error: 'Upload failed' }))).error);
    return res.json();
  },
};