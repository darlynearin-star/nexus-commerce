'use client';
import { useEffect } from 'react';
import { snapshotSiteTheme, restoreSiteTheme, applyThemeColors, resolveThemeMode } from '@nexus/shared';
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
  //
  // The colour-key -> CSS-variable mapping and the dark/light decision both come
  // from @nexus/shared so this can never drift from the dashboard theme editor.
  useEffect(() => {
    if (!store?.theme?.colors) return;
    const root = document.documentElement;

    const snap = snapshotSiteTheme(root);
    root.dataset.storeTheme = 'true';
    root.setAttribute('data-theme', resolveThemeMode(store.theme.colors));
    applyThemeColors(store.theme.colors, root);

    return () => {
      delete root.dataset.storeTheme;
      const stored = localStorage.getItem('linnxy-theme');
      root.setAttribute('data-theme', stored === 'light' ? 'light' : 'dark');
      restoreSiteTheme(snap, root);
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
