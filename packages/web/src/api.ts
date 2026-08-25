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

// True when this browser shows signs of a session (tokens in localStorage).
// Guests (never logged in on this device) must get a clean 401 instead of a
// pointless refresh attempt + hard redirect to /login while browsing public
// pages. (The httpOnly refresh cookie is invisible to JS, so cookie-only
// sessions are treated as guests — they re-authenticate via SSO/login.)
function hasSession(): boolean {
  return !!(getToken() || getRefreshToken());
}

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return; // no loop
  window.location.href = '/login';
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const apiBase = options.apiBase ?? '';
  const uploadBase = options.uploadBase ?? apiBase;

  // Single-flight refresh: N concurrent 401s share ONE /auth/refresh call.
  // (Without this, a dashboard firing 6 requests on mount fires 6 refreshes —
  // six wasted DB session lookups per burst.)
  let refreshInFlight: Promise<string | null> | null = null;
  function refreshAccessToken(): Promise<string | null> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            // Cookie-based refresh: no body needed. Fall back to stored token only when
            // we know a cookie is unavailable (cross-origin SSO).
            body: getRefreshToken() ? JSON.stringify({ refreshToken: getRefreshToken() }) : undefined,
          });
          if (!refreshRes.ok) return null;
          const refreshData = await refreshRes.json();
          localStorage.setItem('accessToken', refreshData.data.accessToken);
          return refreshData.data.accessToken as string;
        } catch {
          return null;
        } finally {
          refreshInFlight = null; // future 401s may refresh again
        }
      })();
    }
    return refreshInFlight;
  }

  /** Shared 401 handling for request() and upload(). Throws on failure. */
  async function handle401(res: Response, url: string, init: RequestInit, currentHeaders: Record<string, string>): Promise<any> {
    // Guest: never refresh, never redirect — the caller decides what an
    // unauthenticated visitor sees.
    if (!hasSession()) {
      const err = await res.clone().json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(401, err.error || 'Request failed');
    }
    const newToken = await refreshAccessToken();
    if (newToken) {
      currentHeaders['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, { ...init, headers: currentHeaders, credentials: 'include' });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(retryRes.status, err.error || 'Request failed');
      }
      return retryRes.json();
    }
    // Refresh failed: end the session; only bounce to /login when the user
    // was actually logged in and isn't already there.
    clearSession();
    redirectToLogin();
    throw new ApiError(401, 'Session expired');
  }

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

    if (res.status === 401) {
      return handle401(res, url, fetchOptions, headers);
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
    const init: RequestInit = { method: 'POST', body: formData };
    const res = await fetch(url, { ...init, headers, credentials: 'include' });

    if (res.status === 401) {
      return handle401(res, url, init, headers);
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