'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ShopRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const activeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') || 'adorn' : 'adorn';
    const qs = searchParams.toString();
    router.replace(`/store/${activeSlug}/shop${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Redirecting to shop...</div>;
}
