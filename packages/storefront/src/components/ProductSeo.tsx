'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SITE_URL = (typeof window !== 'undefined' ? window.location.origin : '') ||
  process.env.NEXT_PUBLIC_STOREFRONT_URL ||
  'https://nexus-storefront-dusky.vercel.app';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = attr === 'name' ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: object) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export default function ProductSeo({ product, storeSlug }: { product: any; storeSlug?: string }) {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (!product) return;
    const canonicalPath = storeSlug
      ? `/store/${storeSlug}/product/${product.slug}`
      : `/product/${product.slug}`;
    const canonical = `${SITE_URL}${canonicalPath}`;
    const image = product.images?.[0] || `https://picsum.photos/seed/${product.id}/600/600`;

    upsertMeta('name', 'description', `${product.description || product.name}. UGX ${Number(product.price).toLocaleString()} at ${product.storeName || 'Lyn-nyx Stores'}.`);
    upsertMeta('property', 'og:title', product.name);
    upsertMeta('property', 'og:description', product.description || product.name);
    upsertMeta('property', 'og:type', 'product');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', product.storeName || 'Lyn-nyx Stores');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', product.name);
    upsertMeta('name', 'twitter:description', product.description || product.name);
    upsertMeta('name', 'twitter:image', image);
    upsertCanonical(canonical);
    document.title = `${product.name} | Lyn-nyx Stores`;

    upsertJsonLd('product-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || product.name,
      image: image,
      sku: product.sku || product.id,
      brand: { '@type': 'Brand', name: product.brand || product.storeName || 'Lyn-nyx Stores' },
      offers: {
        '@type': 'Offer',
        url: canonical,
        priceCurrency: 'UGX',
        price: Number(product.price),
        availability: product.status === 'PUBLISHED' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: product.storeName || 'Lyn-nyx Stores' },
      },
      ...(product.averageRating
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(product.averageRating), reviewCount: product.reviewCount || 0 } }
        : {}),
    });
  }, [product, storeSlug, pathname]);

  return null;
}