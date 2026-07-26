'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, ArrowUp, ArrowDown, AlertTriangle, CheckCircle, Power, ExternalLink } from 'lucide-react';
import ErrorBoundary from '@/lib/error-boundary';
import Link from 'next/link';

function DashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>({});
  const [store, setStore] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    const allowed = ['RETAILER', 'DEVELOPER', 'SUPER_DEVELOPER'];
    if (!allowed.includes(user.role)) { router.push('/login'); return; }
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/stores/mine'),
    ]).then(([s, st]: [any, any]) => {
      setStats(s.data);
      setStore(st.data);
    }).catch(() => setError('Failed to load data'));
  }, [user, loading]);

  const storeSlug = store?.slug || localStorage.getItem('activeStoreSlug');
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';

  if (loading || !user) return <div style={{ padding: '2rem' }}>{loading ? 'Loading...' : 'Redirecting...'}</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--error)' }}>{error}</div>;

  const cards = [
    { label: 'Total Revenue', value: `UGX ${(stats.totalRevenue || 0).toLocaleString()}`, icon: <DollarSign size={24} />, change: '+12.5%', positive: true },
    { label: 'Total Orders', value: (stats.totalOrders || 0).toString(), icon: <ShoppingCart size={24} />, change: '+8.2%', positive: true },
    { label: 'Total Customers', value: (stats.totalCustomers || 0).toString(), icon: <Users size={24} />, change: '+5.7%', positive: true },
    { label: 'Total Products', value: (stats.totalProducts || 0).toString(), icon: <Package size={24} />, change: '+3.1%', positive: true },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Welcome back, {user.firstName}! Here&apos;s your store overview.</p>
      </div>

      {/* Store status banner */}
      {store && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', background: store.isActive ? 'var(--bg-secondary)' : '#2e0505', border: `1px solid ${store.isActive ? 'var(--border)' : '#f87171'}` }}>
          {store.isActive ? <CheckCircle size={20} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={20} style={{ color: '#f87171' }} />}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{store.name} — <span style={{ color: store.isActive ? 'var(--success)' : '#f87171' }}>{store.isActive ? 'Active' : 'Paused'}</span></p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{store.isActive ? 'Your store is live and accepting orders.' : 'Your store is paused. Customers cannot see it or place orders.'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <Link href="/settings" className="btn btn-ghost btn-sm">Settings</Link>
            {storeSlug && (
              <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View Store <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {cards.map((card, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div className="stat-card"><span className="label">{card.label}</span><span className="value">{card.value}</span></div>
              <div style={{ color: 'var(--primary)', opacity: 0.7 }}>{card.icon}</div>
            </div>
            <div className="change" style={{ color: card.positive ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {card.positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {card.change} vs last month
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Recent Orders</h3><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No recent orders to display.</p></div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Low Stock Alerts</h3><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>All products adequately stocked.</p></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
