'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({});
  useEffect(() => { api.get('/analytics/summary').then((r: any) => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Reports</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Revenue', value: `$${(stats.totalRevenue || 0).toFixed(2)}` },
          { label: 'Total Orders', value: (stats.totalOrders || 0).toString() },
          { label: 'Avg Order Value', value: `$${(stats.averageOrderValue || 0).toFixed(2)}` },
          { label: 'Conversion Rate', value: `${(stats.conversionRate || 2.4).toFixed(1)}%` },
          { label: 'Total Customers', value: (stats.totalCustomers || 0).toString() },
          { label: 'Products Sold', value: (stats.totalProducts || 0).toString() },
        ].map((r, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{r.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}