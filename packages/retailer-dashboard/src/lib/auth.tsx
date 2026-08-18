'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { decodeJwt, captureTokenFromUrl } from '@nexus/web';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; }
interface AuthContextType { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

async function ensureStore() {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  try {
    await api.get('/stores/mine');
  } catch (e: any) {
    if (e?.status === 404) {
      const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
      window.location.href = `${storefrontUrl}/create-store#token=${encodeURIComponent(token)}`;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const urlToken = captureTokenFromUrl();

  useEffect(() => {
    const token = urlToken || localStorage.getItem('accessToken');
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        setUser({ id: payload.userId, email: payload.email, role: payload.role, firstName: '', lastName: '', avatar: undefined });
        if (payload.role === 'RETAILER') ensureStore();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    const payload = decodeJwt(res.data.accessToken);
    if (payload) {
      setUser({ id: payload.userId, email: payload.email, role: payload.role, firstName: '', lastName: '', avatar: undefined });
    }
    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
    if (res.data.user?.role === 'RETAILER') {
      const hasStore = await api.get('/stores/mine').then(() => true).catch(() => false);
      if (hasStore) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = `${storefrontUrl}/create-store#token=${encodeURIComponent(res.data.accessToken)}`;
      }
    } else {
      window.location.href = `${storefrontUrl}/?noStore=1#token=${encodeURIComponent(res.data.accessToken)}`;
    }
  };

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('activeStoreSlug'); setUser(null); api.post('/auth/logout').catch(() => {}); router.push('/login'); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}