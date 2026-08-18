export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export interface ApiClientOptions {
  apiBase?: string;
  uploadBase?: string;
  includeStoreSlug?: boolean;
  preserveExistingStoreSlug?: boolean;
}

export interface ApiClient {
  request: <T = any>(endpoint: string, options?: FetchOptions) => Promise<T>;
  api: {
    get: <T = any>(endpoint: string, params?: Record<string, string | number | undefined>) => Promise<T>;
    post: <T = any>(endpoint: string, data?: any) => Promise<T>;
    put: <T = any>(endpoint: string, data?: any) => Promise<T>;
    delete: <T = any>(endpoint: string) => Promise<T>;
    upload: <T = any>(endpoint: string, formData: FormData) => Promise<T>;
  };
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const apiBase = options.apiBase ?? '';
  const uploadBase = options.uploadBase ?? apiBase;

  function buildHeaders(headers?: HeadersInit, forUpload = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (!forUpload) h['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (options.includeStoreSlug) {
      const storeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : null;
      if (storeSlug && (options.preserveExistingStoreSlug ? !(headers as Record<string, string>)?.['x-store-slug'] : true)) {
        h['x-store-slug'] = storeSlug;
      }
    }
    return { ...h, ...(headers as Record<string, string>) };
  }

  async function request<T = any>(endpoint: string, requestOptions: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = requestOptions;
    let url = `${apiBase}/api${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers = buildHeaders(requestOptions.headers);
    const res = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });

    if (res.status === 401 && (getRefreshToken() || typeof document !== 'undefined')) {
      const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Cookie-based refresh: no body needed. Fall back to stored token only when
        // we know a cookie is unavailable (cross-origin SSO).
        body: getRefreshToken() ? JSON.stringify({ refreshToken: getRefreshToken() }) : undefined,
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        const retryRes = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Request failed' }));
          throw new ApiError(retryRes.status, err.error || 'Request failed');
        }
        return retryRes.json();
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new ApiError(401, 'Session expired');
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(res.status, err.error || 'Request failed');
    }

    return res.json();
  }

  async function upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${uploadBase}/api${endpoint}`;
    const headers = buildHeaders(undefined, true);
    const res = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'include' });

    if (res.status === 401 && (getRefreshToken() || typeof document !== 'undefined')) {
      const refreshRes = await fetch(`${uploadBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: getRefreshToken() ? JSON.stringify({ refreshToken: getRefreshToken() }) : undefined,
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('accessToken', refreshData.data.accessToken);
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        const retryRes = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'include' });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Upload failed' }));
          throw new ApiError(retryRes.status, err.error || 'Upload failed');
        }
        return retryRes.json();
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(res.status, err.error || 'Upload failed');
    }

    return res.json();
  }

  return {
    request,
    api: {
      get: <T = any>(endpoint: string, params?: Record<string, string | number | undefined>) =>
        request<T>(endpoint, { params }),
      post: <T = any>(endpoint: string, data?: any) =>
        request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
      put: <T = any>(endpoint: string, data?: any) =>
        request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
      delete: <T = any>(endpoint: string) =>
        request<T>(endpoint, { method: 'DELETE' }),
      upload,
    },
  };
}