'use client';
import { useEffect } from 'react';
import { StoreProvider, useStore } from '@/lib/store-context';
import { setStoreSlug } from '@/lib/store-api';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

function StoreInner({ children }: { children: React.ReactNode }) {
  const { store } = useStore();

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
    if (store?.slug) { setStoreSlug(store.slug); localStorage.setItem('activeStoreSlug', store.slug); }
  }, [store]);

  if (!store) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--error)' }}>Store not found or is disabled</div>;

  return (
    <>
      <StoreHeader />
      <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1 }}>{children}</main>
      <StoreFooter />
    </>
  );
}

export default function StoreShell({ store, slug, children }: { store: any; slug: string; children: React.ReactNode }) {
  return (
    <StoreProvider slug={slug} initialStore={store}>
      <StoreInner>{children}</StoreInner>
    </StoreProvider>
  );
}