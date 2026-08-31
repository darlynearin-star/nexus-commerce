const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';

export const REVALIDATE_SECONDS = 60;

// Render's free tier can be slow / occasionally hang on cold starts or during
// upstream DB (Supabase pooler) flakiness. Without an abort timeout the SSR
// page blocks on `load` until the upstream finally responds — which can stall
// past a browser's timeout even though the client has a graceful fallback.
// We cap each server-side call so a hung request fails fast and returns null,
// letting the page render immediately and hydrate from the client instead.
const SERVER_API_TIMEOUT_MS = 8000;

const timeoutSignal = (ms: number) => {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

async function serverApi<T = any>(endpoint: string, storeSlug?: string, init: RequestInit = {}): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
      ...(storeSlug ? { 'x-store-slug': storeSlug } : {}),
    };
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers,
      signal: timeoutSignal(SERVER_API_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPublicStore(storeSlug: string) {
  const res = await serverApi<{ data: any }>(`/api/stores/public/${storeSlug}`);
  return res?.data ?? null;
}

export async function fetchStoreHome(storeSlug: string) {
  const [featuredRes, newRes, categoriesRes] = await Promise.all([
    serverApi<{ data: any[] }>(`/api/products/featured/list`, storeSlug),
    serverApi<{ data: any[] }>(`/api/products/new/list`, storeSlug),
    serverApi<{ data: any[] }>(`/api/categories?sortBy=productCount`, storeSlug),
  ]);
  return {
    featured: featuredRes?.data ?? [],
    newArrivals: newRes?.data ?? [],
    categories: categoriesRes?.data ?? [],
  };
}

export async function fetchStoreShop(storeSlug: string, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  params.set('page', '1');
  params.set('limit', '12');
  params.set('sort', 'createdAt');
  params.set('order', 'desc');
  const search = searchParams.search;
  const category = searchParams.category;
  const parent = searchParams.parent;
  if (search) params.set('search', String(search));
  if (category) params.set('category', String(category));
  else if (parent) params.set('parent', String(parent));

  const [productsRes, categoriesRes] = await Promise.all([
    serverApi<{ data: any[]; meta?: { totalPages?: number } }>(`/api/products?${params.toString()}`, storeSlug),
    serverApi<{ data: any[] }>(`/api/categories`, storeSlug),
  ]);
  return {
    products: productsRes?.data ?? [],
    totalPages: productsRes?.meta?.totalPages ?? 1,
    categories: categoriesRes?.data ?? [],
  };
}

export async function fetchStoreProduct(storeSlug: string, slug: string) {
  const res = await serverApi<{ data: any }>(`/api/products/${slug}`, storeSlug);
  return res?.data ?? null;
}