'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Mail } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get('/customers', { limit: 50 }).then((r: any) => setCustomers(r.data)).catch(() => {}); }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Customers</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{customers.length} customers</p></div>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Spent</th><th>Group</th><th>Joined</th></tr></thead>
          <tbody>
            {customers.filter(c => !search || c.user?.email?.includes(search) || c.user?.firstName?.includes(search)).map(c => (
              <tr key={c.id}>
                <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>{c.user?.firstName?.[0]}{c.user?.lastName?.[0]}</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.user?.firstName} {c.user?.lastName}</span>
                </td>
                <td style={{ fontSize: '0.8125rem' }}>{c.user?.email}</td>
                <td>{c.totalOrders || 0}</td>
                <td style={{ fontWeight: 600 }}>${(c.totalSpent || 0).toFixed(2)}</td>
                <td><span className={`badge ${c.group === 'VIP' ? 'badge-warning' : 'badge-info'}`}>{c.group}</span></td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}