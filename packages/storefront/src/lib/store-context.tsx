'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

interface StoreTheme {
  template: string;
  colors: Record<string, string>;
}

interface StoreSettings {
  currency: string;
  taxRate: number;
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

export function StoreProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/stores/public/${slug}`)
      .then((res: any) => setStore(res.data))
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [slug]);

  return <StoreContext.Provider value={{ store, loading, slug }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
