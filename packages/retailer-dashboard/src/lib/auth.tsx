'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; }
interface AuthContextType { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    const tokenParam = hashParams.get('token');
    if (tokenParam) {
      localStorage.setItem('accessToken', tokenParam);
      window.history.replaceState({}, '', window.location.pathname);
      loadUser();
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (token) loadUser();
    else setLoading(false);
  }, []);

  async function loadUser(retries = 0) {
    try {
      const res = await api.get<any>('/auth/me');
      setUser(res.data);
      if (res.data.retailer?.storeSlug) localStorage.setItem('activeStoreSlug', res.data.retailer.storeSlug);
      setLoading(false);
    } catch (e: any) {
      if (e?.status === 401) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setLoading(false); return; }
      if (retries < 4) {
        setTimeout(() => loadUser(retries + 1), [5000, 15000, 25000, 35000][retries]);
      } else {
        setLoading(false);
      }
    }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    if (res.data.user?.retailer?.storeSlug) {
      localStorage.setItem('activeStoreSlug', res.data.user.retailer.storeSlug);
      router.push('/dashboard');
    } else {
      const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
      window.location.href = `${storefrontUrl}/?noStore=1#token=${encodeURIComponent(res.data.accessToken)}`;
    }
  };

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('activeStoreSlug'); setUser(null); router.push('/login'); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}