'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; }
interface AuthContextType {
  user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>; logout: () => void;
}
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    try {
      if (localStorage.getItem('accessToken')) {
        const res = await api.get<any>('/auth/me');
        setUser(res.data);
      }
    } catch (e: any) {
      if (e?.status === 401) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }
    } finally {
      setLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    router.push('/account');
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

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}