'use client';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function AuthGuard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (roles && !roles.includes(user.role)) { router.push('/login'); return; }
    if (!localStorage.getItem('activeStoreSlug')) {
      const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
      window.location.href = `${storefrontUrl}/?noStore=1#token=${encodeURIComponent(localStorage.getItem('accessToken') || '')}`;
      return;
    }
  }, [user, loading, roles, router]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  if (!localStorage.getItem('activeStoreSlug')) return null;

  return <>{children}</>;
}
