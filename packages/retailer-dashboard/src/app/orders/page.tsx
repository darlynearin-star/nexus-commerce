'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Eye, Check, X } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/orders', { limit: 50 }).then((r: any) => setOrders(r.data)).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false)); }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Orders</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{orders.length} orders</p></div>
      {loading ? <div className="card"><div className="skeleton" style={{ height: 200 }} /></div> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{o.orderNumber}</td>
                  <td style={{ fontSize: '0.875rem' }}>{o.customer?.user?.firstName} {o.customer?.user?.lastName}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>${o.total.toFixed(2)}</td>
                  <td><span className={`badge ${o.status === 'COMPLETED' ? 'badge-success' : o.status === 'PROCESSING' ? 'badge-warning' : o.status === 'CANCELLED' ? 'badge-error' : 'badge-info'}`}>{o.status}</span></td>
                  <td><span className={`badge ${o.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{o.paymentStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {o.status === 'PENDING' && <button className="btn btn-ghost btn-icon" onClick={() => updateStatus(o.id, 'PROCESSING')} title="Process"><Check size={14} /></button>}
                      {o.status === 'PROCESSING' && <button className="btn btn-ghost btn-icon" onClick={() => updateStatus(o.id, 'COMPLETED')} title="Complete"><Check size={14} /></button>}
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => updateStatus(o.id, 'CANCELLED')} title="Cancel"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}