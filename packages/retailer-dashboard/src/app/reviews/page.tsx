'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, Star, Trash2, Check, Clock, BadgeCheck } from 'lucide-react';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews?status=${filter}`);
      setReviews(res.data || []);
    } catch (e: any) {
      console.error('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id: string) => {
    try {
      await api.put(`/reviews/${id}/approve`);
      load();
    } catch (e: any) {
      console.error('Approve error:', e);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/reviews/${id}`);
      load();
    } catch (e: any) {
      console.error('Delete error:', e);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={22} /> Reviews
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Reviews appear on your storefront only after you approve them.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {TABS.map(t => (
          <button key={t.key} className={`btn btn-sm ${filter === t.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <h3>No {filter === 'all' ? '' : filter} reviews</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {filter === 'pending' ? 'Nothing waiting for approval right now.' : 'Customer reviews will show up here once submitted.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container"><table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th style={{ textAlign: 'center' }}>Rating</th>
                <th>Review</th>
                <th style={{ textAlign: 'center' }}>Verified</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Date</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.product?.name || 'Deleted product'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.product?.shortCode || ''}</p>
                  </td>
                  <td>
                    <p style={{ fontSize: '0.875rem' }}>{r.customer?.user?.firstName && r.customer?.user?.lastName ? `${r.customer.user.firstName} ${r.customer.user.lastName}`.trim() : 'Customer'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.customer?.user?.email || ''}</p>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ color: 'var(--warning)', display: 'inline-flex', gap: '0.125rem', alignItems: 'center', fontSize: '0.75rem' }}>
                      {'★'.repeat(r.rating)}<span style={{ color: 'var(--text-secondary)' }}>{r.rating}/5</span>
                    </span>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {r.title && <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.title}</p>}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.content || '—'}</p>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {r.isVerifiedPurchase
                      ? <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><BadgeCheck size={13} /> Verified</span>
                      : <span className="badge">Guest</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${r.isApproved ? 'badge-success' : 'badge-warning'}`}>{r.isApproved ? 'Approved' : 'Pending'}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      {!r.isApproved && (
                        <button className="btn btn-ghost btn-icon" title="Approve" aria-label="Approve" onClick={() => approve(r.id)}>
                          <Check size={14} style={{ color: 'var(--success)' }} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} title="Delete" aria-label="Delete" onClick={() => remove(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {filter !== 'pending' && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Clock size={12} /> Reviews created by customers start as &quot;Pending&quot; and are hidden from your store until approved.
        </p>
      )}
    </div>
  );
}