'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDismiss } from '@/lib/use-dismiss';
import { Search, Eye, Check, X, Phone, MapPin, StickyNote, Mail, ShoppingBag } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  // H13: money-adjacent actions get busy states, surfaced errors, and a
  // confirm on the destructive path (reference: dev subscriptions page).
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const detailRef = useDismiss(!!detail, () => setDetail(null));

  useEffect(() => { api.get('/orders', { limit: 50 }).then((r: any) => setOrders(r.data)).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false)); }, []);

  const updateStatus = async (id: string, status: string) => {
    if (status === 'CANCELLED' && !confirm('Cancel this order? This cannot be undone.')) return;
    setBusyId(id);
    setActionError('');
    try {
      await api.put(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setDetail((prev: any) => prev && prev.id === id ? { ...prev, status } : prev);
    } catch (e: any) {
      setActionError(e?.message || 'Could not update the order. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (s: string) => (
    <span className={`badge ${s === 'COMPLETED' ? 'badge-success' : s === 'PROCESSING' ? 'badge-warning' : s === 'CANCELLED' ? 'badge-error' : 'badge-info'}`}>{s}</span>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Orders</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{orders.length} orders</p></div>
      {actionError && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: '#2e0505', color: '#f87171', border: '1px solid #f87171', fontSize: '0.875rem' }}>{actionError}</div>
      )}
      {loading ? <div className="card"><div className="skeleton" style={{ height: 200 }} /></div> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container"><table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.orderNumber}</td>
                  <td style={{ fontSize: '0.875rem' }}>{o.customer?.user?.firstName} {o.customer?.user?.lastName}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>UGX {o.total.toLocaleString()}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td><span className={`badge ${o.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{o.paymentStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => setDetail(o)} title="View details" aria-label="View details" disabled={busyId === o.id}><Eye size={14} /></button>
                      {o.status === 'PENDING' && <button className="btn btn-ghost btn-icon" onClick={() => updateStatus(o.id, 'PROCESSING')} title="Process" aria-label="Process" disabled={busyId === o.id}><Check size={14} /></button>}
                      {o.status === 'PROCESSING' && <button className="btn btn-ghost btn-icon" onClick={() => updateStatus(o.id, 'COMPLETED')} title="Complete" aria-label="Complete" disabled={busyId === o.id}><Check size={14} /></button>}
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => updateStatus(o.id, 'CANCELLED')} title="Cancel" aria-label="Cancel" disabled={busyId === o.id}><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setDetail(null)}>
          <div ref={detailRef} tabIndex={-1} style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Order {detail.orderNumber}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
                  {statusBadge(detail.status)}
                  <span className={`badge ${detail.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{detail.paymentStatus}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)} aria-label="Close order details"><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Customer</div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{detail.customer?.user?.firstName} {detail.customer?.user?.lastName}</div>
                {detail.customer?.user?.email && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}><Mail size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />{detail.customer.user.email}</div>
                )}
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total</div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>UGX {detail.total.toLocaleString()}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Subtotal UGX {detail.subtotal.toLocaleString()} · Tax UGX {detail.taxAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Delivery Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem' }}><Phone size={13} style={{ verticalAlign: 'middle', marginRight: '0.375rem', color: 'var(--primary)' }} />{detail.customerPhone || 'No phone provided'}</div>
                  <div style={{ fontSize: '0.875rem' }}><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '0.375rem', color: 'var(--primary)' }} />{detail.shippingAddress || 'No address provided'}</div>
                  {detail.notes && <div style={{ fontSize: '0.875rem' }}><StickyNote size={13} style={{ verticalAlign: 'middle', marginRight: '0.375rem', color: 'var(--primary)' }} />{detail.notes}</div>}
                </div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(detail.items || []).map((it: any) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <ShoppingBag size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span>{it.productName}</span>
                        {it.variantName && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>({it.variantName})</span>}
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>x{it.quantity}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>UGX {it.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', fontWeight: 700 }}>
                  <span>Total</span>
                  <span>UGX {detail.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {detail.status === 'PENDING' && <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'PROCESSING')} disabled={busyId === detail.id}><Check size={16} /> Process Order</button>}
              {detail.status === 'PROCESSING' && <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'COMPLETED')} disabled={busyId === detail.id}><Check size={16} /> Mark Completed</button>}
              <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => updateStatus(detail.id, 'CANCELLED')} disabled={busyId === detail.id}><X size={16} /> Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
