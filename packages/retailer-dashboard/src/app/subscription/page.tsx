'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<any>('/subscriptions').then((r: any) => setSub(r.data)).catch((e: any) => console.error('Failed to load subscription:', e)).finally(() => setLoading(false));
  }, [user]);

  const subscribe = async () => {
    setMessage(null);
    try {
      const r: any = await api.post('/subscriptions/subscribe');
      setSub(r.data);
      setMessage({ type: 'success', text: 'Subscription activated!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to activate' });
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel your subscription?')) return;
    setMessage(null);
    try {
      const r: any = await api.post('/subscriptions/cancel');
      setSub(r.data);
      setMessage({ type: 'success', text: 'Subscription cancelled' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to cancel' });
    }
  };

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading subscription...</div>;

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    TRIAL: { icon: Clock, color: 'var(--primary)', label: 'Trial' },
    ACTIVE: { icon: CheckCircle, color: 'var(--success, #4ade80)', label: 'Active' },
    SUSPENDED: { icon: XCircle, color: 'var(--error, #f87171)', label: 'Suspended' },
    CANCELLED: { icon: XCircle, color: 'var(--text-secondary)', label: 'Cancelled' },
  };
  const status = statusConfig[sub?.status] || statusConfig.TRIAL;
  const StatusIcon = status.icon;

  const trialEnd = sub?.trialEnd ? new Date(sub.trialEnd) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 14;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Subscription</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage your store subscription</p>

      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: message.type === 'success' ? '#052e16' : '#2e0505', color: message.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${message.type === 'success' ? '#4ade80' : '#f87171'}` }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}

      <div className="card" style={{ padding: '2rem', maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <CreditCard size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontWeight: 600 }}>Store Subscription</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>3,000 UGX / week after trial</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <StatusIcon size={18} style={{ color: status.color }} />
          <span style={{ fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>

        {sub?.status === 'TRIAL' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Trial ends in</span>
              <span style={{ fontWeight: 600 }}>{trialDaysLeft} days</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (trialDaysLeft / 14) * 100)}%`, background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {sub?.payments?.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payment History</h3>
            {sub.payments.slice(0, 5).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                <span>{p.amount.toLocaleString()} {p.currency}</span>
                <span style={{ color: p.status === 'PAID' ? '#4ade80' : 'var(--text-secondary)' }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          {(sub?.status === 'TRIAL' || sub?.status === 'SUSPENDED') && (
            <button className="btn btn-primary" onClick={subscribe} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} /> Activate Subscription
            </button>
          )}
          {sub?.status === 'ACTIVE' && (
            <button className="btn btn-secondary" onClick={cancel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
