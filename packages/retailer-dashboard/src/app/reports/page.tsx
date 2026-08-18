'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, TrendingUp, Calendar, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>({});
  const [revenue, setRevenue] = useState<any>({ daily: [], weekly: [], monthly: [], totals: {} });
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    Promise.all([
      api.get<any>(`/analytics/summary?days=${days}`),
      api.get<any>(`/analytics/revenue?days=${days}`),
    ]).then(([s, r]: [any, any]) => {
      setSummary(s.data);
      setRevenue(r.data);
    }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, [period]);

  const exportCsv = () => {
    const rows = [['Date/Period', 'Revenue (UGX)']];
    if (revenue?.daily) revenue.daily.forEach((d: any) => rows.push([d.date, d.revenue.toFixed(0)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'revenue-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-UG').format(Math.round(n));

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading reports...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Store analytics and revenue breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto', padding: '0.375rem 0.75rem' }} aria-label="Report period" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last year</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { icon: <DollarSign size={20} />, label: 'Revenue', value: `UGX ${fmt(summary.totalRevenue || 0)}` },
          { icon: <ShoppingCart size={20} />, label: 'Orders', value: (summary.totalOrders || 0).toString() },
          { icon: <Users size={20} />, label: 'Customers', value: (summary.totalCustomers || 0).toString() },
          { icon: <Package size={20} />, label: 'Products', value: (summary.totalProducts || 0).toString() },
          { icon: <TrendingUp size={20} />, label: 'Avg Order', value: `UGX ${fmt(summary.averageOrderValue || 0)}` },
        ].map((c, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{c.icon}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{c.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Weekly Revenue</h3>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>UGX {fmt(revenue.totals?.weekly || 0)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(revenue.weekly || []).slice(-8).map((w: any, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{w.week}</span>
                  <span style={{ fontWeight: 500 }}>UGX {fmt(w.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (w.revenue / Math.max(...revenue.weekly.map((x: any) => x.revenue))) * 100)}%`, background: 'var(--primary)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {(!revenue.weekly || revenue.weekly.length === 0) && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No revenue data yet</p>}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Monthly Revenue</h3>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>UGX {fmt(revenue.totals?.monthly || 0)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(revenue.monthly || []).slice(-8).map((m: any, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{m.month}</span>
                  <span style={{ fontWeight: 500 }}>UGX {fmt(m.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (m.revenue / Math.max(...revenue.monthly.map((x: any) => x.revenue))) * 100)}%`, background: 'var(--primary)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {(!revenue.monthly || revenue.monthly.length === 0) && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No revenue data yet</p>}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>All-Time Totals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Total Revenue', value: `UGX ${fmt(revenue.totals?.allTime || 0)}` },
              { label: 'Total Orders', value: summary.totalOrders?.toString() || '0' },
              { label: 'Total Customers', value: summary.totalCustomers?.toString() || '0' },
              { label: 'Total Products', value: summary.totalProducts?.toString() || '0' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
