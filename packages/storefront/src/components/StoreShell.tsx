'use client';
import { useEffect } from 'react';
import { StoreProvider, useStore } from '@/lib/store-context';
import { setStoreSlug } from '@/lib/store-api';
import StoreHeader from '@/components/StoreHeader';
import StoreFooter from '@/components/StoreFooter';

function StoreInner({ children }: { children: React.ReactNode }) {
  const { store } = useStore();

  useEffect(() => {
    if (store?.slug) { setStoreSlug(store.slug); localStorage.setItem('activeStoreSlug', store.slug); }
  }, [store]);

  // H11: the store OWNS the page theme while mounted. We snapshot whatever the
  // site theme had (data-theme + inline vars), apply the store's brand, and
  // restore everything on unmount — previously a store's brass colors leaked
  // into the whole main site until a full reload.
  // The data-store-theme marker tells ThemeProvider to keep its hands off
  // while a store owns the look (they used to overwrite each other).
  useEffect(() => {
    if (!store?.theme?.colors) return;
    const c = store.theme.colors;
    const root = document.documentElement;
    const isDark = store.theme.template === 'elegance' || store.theme.template === 'bold';

    const prevTheme = root.getAttribute('data-theme');
    const themedVars = ['--primary', '--primary-dark', '--bg', '--surface', '--text', '--primary-light'] as const;
    const prevVars = themedVars.map(v => [v, root.style.getPropertyValue(v)] as const);

    root.dataset.storeTheme = 'true';
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (c.primary) root.style.setProperty('--primary', c.primary);
    if (c.secondary) root.style.setProperty('--primary-dark', c.secondary);
    if (c.bg) root.style.setProperty('--bg', c.bg);
    if (c.surface) root.style.setProperty('--surface', c.surface);
    if (c.text) root.style.setProperty('--text', c.text);
    if (c.accent) root.style.setProperty('--primary-light', c.accent);

    return () => {
      delete root.dataset.storeTheme;
      const stored = localStorage.getItem('linnxy-theme');
      root.setAttribute('data-theme', stored === 'light' ? 'light' : 'dark');
      for (const [v, val] of prevVars) {
        if (val) root.style.setProperty(v, val);
        else root.style.removeProperty(v);
      }
    };
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
