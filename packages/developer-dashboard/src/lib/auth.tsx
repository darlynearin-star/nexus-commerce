'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { decodeJwt, captureTokenFromUrl } from '@nexus/web';
import { api } from '@/lib/api';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; }
interface AuthContextType { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Capture (and strip) any #token= handoff inside an effect — never during
    // render, which must stay side-effect free.
    const urlToken = captureTokenFromUrl();
    const token = urlToken || localStorage.getItem('accessToken');
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        setUser({ id: payload.userId, email: payload.email, role: payload.role, firstName: '', lastName: '' });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  };

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null); api.post('/auth/logout').catch(() => {}); router.push('/login'); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
