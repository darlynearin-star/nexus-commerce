'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function MarketingPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  useEffect(() => { api.get('/coupons').then((r: any) => setCoupons(r.data)).catch((e: any) => console.error('API error:', e)); }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Marketing</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Coupons</h3>
          {coupons.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No coupons created yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {coupons.map(c => <div key={c.id} style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.code}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.description}</p></div>
                <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}</p><span className={`badge ${c.isActive ? 'badge-success' : 'badge-error'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></div>
              </div>)}
            </div>
          )}
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Email Campaigns</h3><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Campaign management coming soon.</p></div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Abandoned Cart Recovery</h3><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Recovery automation coming soon.</p></div>
      </div>
    </div>
  );
}