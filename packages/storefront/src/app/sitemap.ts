import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
  { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/deals`, changeFrequency: 'daily', priority: 0.7 },
  { url: `${SITE_URL}/guides`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/register`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/create-store`, changeFrequency: 'monthly', priority: 0.6 },
];

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', headers });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [...STATIC_ROUTES];

  const storeRes = await fetchJson<{ data: { id: string; slug: string }[] }>(`${API_URL}/api/stores/public`);
  const stores = storeRes?.data || [];

  for (const store of stores) {
    routes.push({ url: `${SITE_URL}/store/${store.slug}`, changeFrequency: 'daily', priority: 0.9 });
    routes.push({ url: `${SITE_URL}/store/${store.slug}/shop`, changeFrequency: 'daily', priority: 0.9 });

    const productRes = await fetchJson<{ data: { slug: string }[] }>(
      `${API_URL}/api/products?limit=500`,
      { 'x-store-slug': store.slug },
    );
    if (productRes?.data) {
      for (const product of productRes.data) {
        routes.push({
          url: `${SITE_URL}/store/${store.slug}/product/${product.slug}`,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  return routes;
}