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
    }, [user, loading, router]);

    if (loading) return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: 40, width: '30%' }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
    if (!user) return null;
    // L-role: show "Access Denied" instead of redirecting to /login when the
    // user is logged in but lacks the required role.
    if (roles && !roles.includes((user as any).role)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You don&apos;t have permission to view this page.</p>
          <a href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app'} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go Home</a>
        </div>
      );
    }

    return <>{children}</>;
  };
}