'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; retailer?: { storeName: string; storeSlug: string; subscription?: { status: string; trialEnd: string; trialStart: string; nextBillingDate?: string; weeklyAmount: number; currency: string; } }; developer?: any; customer?: any; }
interface AuthContextType {
  user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>; logout: () => void;
  completeSession: (res: { user: User; accessToken: string; refreshToken: string }) => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadUser(); }, []);

  async function loadUser(retries = 0) {
    try {
      if (localStorage.getItem('accessToken')) {
        const res = await api.get<any>('/auth/me');
        setUser(res.data);
      }
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

  async function completeSession(res: { user: User; accessToken: string; refreshToken: string }) {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setUser(res.user);
    const role = res.user?.role;
    if (role === 'RETAILER') {
      const hasStore = await api.get('/stores/mine').then(() => true).catch(() => false);
      if (hasStore) {
        window.location.href = (process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app') + '/dashboard#token=' + encodeURIComponent(res.accessToken);
      } else {
        router.push('/create-store');
      }
    } else if (role === 'DEVELOPER' || role === 'SUPER_DEVELOPER') {
      window.location.href = (process.env.NEXT_PUBLIC_DEVELOPER_DASHBOARD_URL || 'https://nexus-commerce-developer-dashboard.vercel.app') + '/dashboard';
    } else {
      router.push('/account');
    }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    await completeSession(res.data);
  };

  const register = async (data: any) => {
    const res = await api.post<any>('/auth/register', data);
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    if (data.role === 'RETAILER') router.push('/create-store');
    else router.push('/account');
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/');
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, completeSession }}>{children}</AuthContext.Provider>;
}