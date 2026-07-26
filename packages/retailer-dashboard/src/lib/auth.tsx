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
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('accessToken', tokenParam);
      window.history.replaceState({}, '', window.location.pathname);
      loadUser();
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (token) loadUser();
    else { setLoading(false); if (!localStorage.getItem('activeStoreSlug')) localStorage.setItem('activeStoreSlug', 'adorn'); }
  }, []);

  async function loadUser() {
    try {
      const res = await api.get<any>('/auth/me');
      setUser(res.data);
      if (res.data.retailer?.storeSlug) localStorage.setItem('activeStoreSlug', res.data.retailer.storeSlug);
    } catch (e: any) {
      if (e?.status === 401) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }
    } finally { setLoading(false); }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    if (res.data.user?.retailer?.storeSlug) localStorage.setItem('activeStoreSlug', res.data.user.retailer.storeSlug);
    setUser(res.data.user);
    router.push('/dashboard');
  };

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('activeStoreSlug'); setUser(null); router.push('/login'); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}