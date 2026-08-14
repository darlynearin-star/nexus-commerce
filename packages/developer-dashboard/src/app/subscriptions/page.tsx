'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { RotateCcw, Lock, Unlock, ExternalLink, CreditCard } from 'lucide-react';
import Link from 'next/link';

const DAY = 24 * 60 * 60 * 1000;

function subPeriod(sub: any) {
  const now = Date.now();
  const isActive = sub.status === 'ACTIVE';
  const start = new Date(isActive ? sub.lastBillingDate || sub.trialStart || sub.createdAt : sub.trialStart || sub.createdAt || sub.createdAt).getTime();
  const end = new Date(isActive ? sub.nextBillingDate || sub.trialEnd || start + 7 * DAY : sub.trialEnd || start + 14 * DAY).getTime();
  const expired = now > end;
  const duration = Math.max(1, end - start);
  const used = Math.max(0, Math.min(1, (now - start) / duration));
  const daysTotal = Math.max(1, Math.ceil(duration / DAY));
  const daysUsed = Math.min(daysTotal, Math.max(0, daysTotal - Math.max(0, Math.ceil((end - now) / DAY))));
  const daysLeft = Math.max(0, Math.ceil((end - now) / DAY));
  return { isActive, expired, used, daysTotal, daysUsed, daysLeft, end };
}

function statusLabel(sub: any): { text: string; className: string } {
  const p = subPeriod(sub);
  if (sub.status === 'SUSPENDED') return { text: 'Locked', className: 'badge-error' };
  if (sub.status === 'CANCELLED') return { text: 'Cancelled', className: 'badge-error' };
  if (sub.status === 'ACTIVE') return p.expired ? { text: 'Expired', className: 'badge-error' } : { text: 'Active', className: 'badge-success' };
  if (sub.status === 'TRIAL') return p.expired ? { text: 'Expired', className: 'badge-error' } : { text: 'Trial', className: 'badge-info' };
  return { text: sub.status, className: 'badge' };
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const r: any = await api.get('/subscriptions/all');
      setSubs(r.data || []);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscriptions');
      console.error('API error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SUPER_DEVELOPER') { router.push('/dashboard'); return; }
    load();
  }, [user]);

  async function act(id: string, action: 'reset-week' | 'lock' | 'unlock', confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    try {
      await api.post(`/subscriptions/${id}/${action}`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
      console.error('Error:', e);
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const list = subs.map(s => ({ s, p: subPeriod(s) }));
    return {
      total: list.length,
      active: list.filter(({ s }) => s.status === 'ACTIVE' && !subPeriod(s).expired).length,
      trial: list.filter(({ s }) => s.status === 'TRIAL' && !subPeriod(s).expired).length,
      expiredOrLocked: list.filter(({ s }) => s.status === 'SUSPENDED' || subPeriod(s).expired).length,
    };
  }, [subs]);

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading subscriptions...</div>;

  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Subscriptions</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Track subscription duration, reset a fresh week, or lock expired accounts</p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ flex: '1 1 160px' }}><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card" style={{ flex: '1 1 160px' }}><div className="stat-label">Active</div><div className="stat-value" style={{ color: '#86efac' }}>{stats.active}</div></div>
        <div className="stat-card" style={{ flex: '1 1 160px' }}><div className="stat-label">In Trial</div><div className="stat-value" style={{ color: '#5CFFD0' }}>{stats.trial}</div></div>
        <div className="stat-card" style={{ flex: '1 1 160px' }}><div className="stat-label">Expired / Locked</div><div className="stat-value" style={{ color: '#fca5a5' }}>{stats.expiredOrLocked}</div></div>
      </div>

      {error && <div className="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Store</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Owner</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Subscription Duration</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Plan</th>
              <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(sub => {
              const p = subPeriod(sub);
              const userActive = sub.retailer?.user?.isActive !== false;
              const store = sub.store;
              const locked = sub.status === 'SUSPENDED' || !userActive;
              const barColor = locked || p.expired ? 'var(--danger)' : p.used >= 0.75 ? 'var(--warning, #f59e0b)' : 'var(--primary)';
              const st = statusLabel(sub);
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{store?.name || sub.retailer?.storeName || '—'}</div>
                    {store?.slug && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}><Link href={`${storefrontUrl}/store/${store.slug}`} target="_blank" style={{ color: 'var(--primary)' }}>/{store.slug}</Link></div>}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{sub.retailer?.user?.firstName} {sub.retailer?.user?.lastName}<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.retailer?.user?.email}</span></td>
                  <td style={{ padding: '1rem' }}><span className={`badge ${st.className}`}>{st.text}</span></td>
                  <td style={{ padding: '1rem', minWidth: 220 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>{p.daysUsed} of {p.daysTotal} days used</span>
                      <span>{p.daysLeft} days left</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-card)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: '100%', width: `${Math.round(p.used * 100)}%`, background: barColor, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {locked ? 'Account locked' : p.expired ? 'Subscription expired' : p.isActive ? 'Active period' : 'Trial period'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    UGX {Number(sub.weeklyAmount || 0).toLocaleString()}/week<br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.payments?.length ?? 0} payments</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" disabled={busyId === sub.id} onClick={() => act(sub.id, 'reset-week')}><RotateCcw size={14} /> Reset Week</button>
                      {locked ? (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === sub.id} onClick={() => act(sub.id, 'unlock', `Reactivate ${store?.name || 'this store'}? User account, store and subscription will be reactivated.`)}><Unlock size={14} /> Unlock</button>
                      ) : (
                        <button className="btn btn-danger btn-sm" disabled={busyId === sub.id} onClick={() => act(sub.id, 'lock', `Lock ${store?.name || 'this store'}? The account, store and subscription will be suspended immediately.`)}><Lock size={14} /> Lock</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {subs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}><CreditCard size={24} style={{ marginBottom: '0.5rem' }} /><br />No subscriptions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
