'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>({});
  const [killSwitch, setKillSwitch] = useState<any>({});

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'DEVELOPER' && user.role !== 'SUPER_DEVELOPER'))) router.push('/login');
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/kill-switch'),
    ]).then(([s, k]) => { setStats(s.data); setKillSwitch(k.data); }).catch((e: any) => console.error('API error:', e));
  }, [user, loading]);

  if (loading || !user) return <div style={{ padding: '2rem' }}>{loading ? 'Loading...' : 'Redirecting...'}</div>;

  const cards = [
    { label: 'Total Revenue', value: `UGX ${(stats.totalRevenue || 0).toLocaleString()}`, icon: <DollarSign size={24} /> },
    { label: 'Total Users', value: (stats.totalCustomers || 0).toString(), icon: <Users size={24} /> },
  ];

  const activeKills = killSwitch ? Object.entries(killSwitch).filter(([k, v]) => v === true && k !== 'id' && k !== 'updatedAt' && k !== 'updatedBy' && k !== 'maintenanceMessage').length : 0;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Developer Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Full platform control and monitoring</p>
      </div>
      {activeKills > 0 && (
        <div className="kill-switch-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={24} />
          <div><p style={{ fontWeight: 600 }}>Kill Switch Active</p><p style={{ fontSize: '0.875rem', opacity: 0.8 }}>{activeKills} system(s) currently disabled</p></div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {cards.map((card, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="stat-card label">{card.label}</span>
              <div style={{ color: 'var(--primary)', opacity: 0.7 }}>{card.icon}</div>
            </div>
            <span className="stat-card value">{card.value}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push('/kill-switch')}>Manage Kill Switch</button>
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push('/users')}>Manage Users</button>
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push('/system')}>System Health</button>
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => router.push('/logs')}>View Activity Logs</button>
        </div>
      </div>
    </div>
  );
}