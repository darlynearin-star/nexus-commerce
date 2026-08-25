'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, CreditCard, RefreshCw } from 'lucide-react';
import { isSubscriptionLocked } from '@/lib/subscription-state';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState(false);

  const loadSub = useCallback(() => {
    if (!user || user.role !== 'RETAILER') { setSubLoading(false); return; }
    setSubLoading(true);
    setSubError(false);
    api.get<any>('/subscriptions')
      .then((r: any) => setSub(r.data))
      .catch(() => { setSub(null); setSubError(true); })
      .finally(() => setSubLoading(false));
  }, [user]);

  useEffect(() => { loadSub(); }, [loadSub]);

  if (loading || !user) return <>{children}</>;
  if (user.role !== 'RETAILER') return <>{children}</>;
  if (pathname === '/subscription' || pathname === '/login') return <>{children}</>;

  if (subLoading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: 40, width: '40%' }} />
      <div className="skeleton" style={{ height: 180 }} />
    </div>
  );

  // H5: unknown subscription state (API error/timeout) locks the dashboard —
  // fail closed, with a retry — instead of silently unlocking paywalled UI.
  if (subError || isSubscriptionLocked(sub, subError)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
        <div className="card" style={{ padding: '2.5rem', maxWidth: 460, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 1rem', width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subError ? 'var(--warning)' : 'var(--error)' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>{subError ? 'Subscription check failed' : 'Subscription Required'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {subError
              ? 'We could not verify your subscription status just now. Your dashboard stays locked until we can confirm it.'
              : 'Your free trial has ended or your subscription is no longer active. Renew your subscription to continue managing your store.'}
          </p>
          {subError ? (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={loadSub}>
              <RefreshCw size={16} /> Retry
            </button>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/subscription')}>
              <CreditCard size={16} /> Go to Subscription
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
