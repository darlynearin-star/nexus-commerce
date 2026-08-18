'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

interface StoreTheme {
  template: string;
  colors: Record<string, string>;
}

interface StoreSettings {
  currency: string;
  shippingThreshold: number;
  location: string;
  shippingRate: number;
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  isActive: boolean;
  theme: StoreTheme | null;
  settings: StoreSettings | null;
}

interface StoreContextValue {
  store: StoreData | null;
  loading: boolean;
  slug: string | null;
}

const StoreContext = createContext<StoreContextValue>({ store: null, loading: true, slug: null });

export function StoreProvider({ slug, children, initialStore }: { slug: string; children: ReactNode; initialStore?: StoreData | null }) {
  const [store, setStore] = useState<StoreData | null>(initialStore ?? null);
  const [loading, setLoading] = useState(!initialStore);

  useEffect(() => {
    if (!slug) return;
    if (initialStore) {
      setStore(initialStore);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/stores/public/${slug}`)
      .then((res: any) => setStore(res.data))
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [slug, initialStore]);

  return <StoreContext.Provider value={{ store, loading, slug }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
