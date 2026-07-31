'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, CreditCard } from 'lucide-react';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'RETAILER') { setSubLoading(false); return; }
    setSubLoading(true);
    api.get<any>('/subscriptions').then((r: any) => setSub(r.data)).catch(() => setSub(null)).finally(() => setSubLoading(false));
  }, [user]);

  if (loading || !user) return <>{children}</>;
  if (user.role !== 'RETAILER') return <>{children}</>;
  if (pathname === '/subscription' || pathname === '/login') return <>{children}</>;

  if (subLoading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>;

  const trialEnded = sub?.status === 'TRIAL' && sub?.trialEnd && new Date(sub.trialEnd) < new Date();
  const locked = !!sub && (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED' || trialEnded);

  if (locked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
        <div className="card" style={{ padding: '2.5rem', maxWidth: 460, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 1rem', width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Subscription Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Your free trial has ended or your subscription is no longer active. Renew your subscription to continue managing your store.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/subscription')}>
            <CreditCard size={16} /> Go to Subscription
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
