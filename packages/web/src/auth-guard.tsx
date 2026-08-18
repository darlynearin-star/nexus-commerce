'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthState<TUser = any> {
  user: TUser | null;
  loading: boolean;
}

export function createAuthGuard<TUser = any>(useAuth: () => AuthState<TUser>) {
  return function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (loading) return;
      if (!user) { router.push('/login'); return; }
      if (roles && !roles.includes((user as any).role)) { router.push('/login'); return; }
    }, [user, loading, roles, router]);

    if (loading) return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: 40, width: '30%' }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
    if (!user) return null;
    if (roles && !roles.includes((user as any).role)) return null;

    return <>{children}</>;
  };
}