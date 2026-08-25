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
  const [payInstructions, setPayInstructions] = useState<any>(null);
  const [payPaymentId, setPayPaymentId] = useState<string | null>(null);
  const [payerNote, setPayerNote] = useState('');
  const [reporting, setReporting] = useState(false);
  // H13: payment-initiating buttons must be double-click safe.
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<any>('/subscriptions').then((r: any) => setSub(r.data)).catch((e: any) => console.error('Failed to load subscription:', e)).finally(() => setLoading(false));
  }, [user]);

  const subscribe = async () => {
    setMessage(null);
    setSubscribing(true);
    try {
      const r: any = await api.post('/subscriptions/subscribe', { method: 'mobile_money' });
      setSub(r.data);
      if (r.data?.checkoutUrl) {
        setMessage({ type: 'success', text: 'Redirecting to payment...' });
        window.location.href = r.data.checkoutUrl;
      } else if (r.payment?.instructions) {
        setPayInstructions(r.payment.instructions);
        setPayPaymentId(r.payment.id);
        setMessage({ type: 'success', text: 'Pay via mobile money to the details below, then confirm.' });
      } else {
        setMessage({ type: 'success', text: 'Subscription activated!' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to activate' });
    } finally {
      setSubscribing(false);
    }
  };

  const reportPaid = async () => {
    if (!payPaymentId) return;
    setReporting(true);
    setMessage(null);
    try {
      const r: any = await api.post('/subscriptions/report-paid', { paymentId: payPaymentId, note: payerNote });
      setMessage({ type: 'success', text: r.message || 'Payment reported. Waiting for confirmation.' });
      setPayInstructions(null);
      setPayPaymentId(null);
      setPayerNote('');
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to report payment' });
    } finally {
      setReporting(false);
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel your subscription?')) return;
    setMessage(null);
    setCancelling(true);
    try {
      const r: any = await api.post('/subscriptions/cancel');
      setSub(r.data);
      setMessage({ type: 'success', text: 'Subscription cancelled' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to cancel' });
    } finally {
      setCancelling(false);
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

        {payInstructions && (
          <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--bg)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pay with Mobile Money</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
              {payInstructions.accountName && <div><span style={{ color: 'var(--text-secondary)' }}>Account: </span><strong>{payInstructions.accountName}</strong></div>}
              {payInstructions.merchantCode && <div><span style={{ color: 'var(--text-secondary)' }}>Merchant code: </span><strong>{payInstructions.merchantCode}</strong></div>}
              {payInstructions.number && <div><span style={{ color: 'var(--text-secondary)' }}>Number: </span><strong>{payInstructions.number}</strong></div>}
              <div><span style={{ color: 'var(--text-secondary)' }}>Amount: </span><strong>{Number(payInstructions.amount || 0).toLocaleString()} {payInstructions.currency || 'UGX'}</strong></div>
              {payInstructions.reference && <div><span style={{ color: 'var(--text-secondary)' }}>Reference: </span><strong>{payInstructions.reference}</strong></div>}
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label htmlFor="payerNote" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>After paying, enter the transaction ID or the number you paid from</label>
              <input id="payerNote" className="input" value={payerNote} onChange={e => setPayerNote(e.target.value)} placeholder="e.g. 8XK2G1M4TQ or 25677XXXXXX" />
              <button className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={reportPaid} disabled={reporting || !payerNote.trim()}>
                {reporting ? 'Submitting...' : 'I have paid — notify the owner'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          {(sub?.status === 'TRIAL' || sub?.status === 'SUSPENDED') && (
            <button className="btn btn-primary" onClick={subscribe} disabled={subscribing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} /> Activate Subscription
            </button>
          )}
          {sub?.status === 'ACTIVE' && (
            <button className="btn btn-secondary" onClick={cancel} disabled={cancelling} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
