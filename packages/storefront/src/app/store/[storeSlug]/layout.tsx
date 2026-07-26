'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StoreProvider, useStore } from '@/lib/store-context';
import { setStoreSlug } from '@/lib/store-api';
function StoreInner({ children }: { children: React.ReactNode }) {
  const { store, loading } = useStore();

  useEffect(() => {
    if (store?.theme?.colors) {
      const c = store.theme.colors;
      const isDark = store.theme.template === 'elegance' || store.theme.template === 'bold';
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      const root = document.documentElement;
      if (c.primary) root.style.setProperty('--primary', c.primary);
      if (c.secondary) root.style.setProperty('--primary-dark', c.secondary);
      if (c.bg) root.style.setProperty('--bg', c.bg);
      if (c.surface) root.style.setProperty('--surface', c.surface);
      if (c.text) root.style.setProperty('--text', c.text);
      if (c.accent) root.style.setProperty('--primary-light', c.accent);
    }
    if (store?.slug) setStoreSlug(store.slug);
  }, [store]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading store...</div>;
  if (!store) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--error)' }}>Store not found or is disabled</div>;

  return <>{children}</>;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.storeSlug as string;

  return (
    <StoreProvider slug={slug}>
      <StoreInner>{children}</StoreInner>
    </StoreProvider>
  );
}
