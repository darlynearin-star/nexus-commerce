'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; }
interface AuthContextType { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

function decodeJwt(token: string): any {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

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
      const payload = decodeJwt(tokenParam);
      if (payload) {
        setUser({ id: payload.userId, email: payload.email, role: payload.role, firstName: '', lastName: '', avatar: undefined });
      }
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        setUser({ id: payload.userId, email: payload.email, role: payload.role, firstName: '', lastName: '', avatar: undefined });
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
      window.location.href = '/dashboard';
    } else {
      window.location.href = `${storefrontUrl}/?noStore=1#token=${encodeURIComponent(res.data.accessToken)}`;
    }
  };

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('activeStoreSlug'); setUser(null); router.push('/login'); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}