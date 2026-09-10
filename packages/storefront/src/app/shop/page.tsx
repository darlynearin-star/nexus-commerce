'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ShopRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const go = (slug: string) => router.replace(`/store/${slug}/shop${qs ? `?${qs}` : ''}`);
    const stored = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : null;
    if (stored) { go(stored); return; }
    // No store visited yet on this device — resolve the default from the real
    // active stores instead of a hardcoded slug that may not exist.
    api
      .get<{ data: { slug: string }[] }>('/stores/public')
      .then((res) => {
        const slug = res.data?.[0]?.slug;
        if (slug) {
          localStorage.setItem('activeStoreSlug', slug);
          go(slug);
        } else {
          router.replace('/');
        }
      })
      .catch(() => router.replace('/'));
  }, [router, searchParams]);

  return <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Redirecting to shop...</div>;
}