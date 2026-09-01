'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Activity, Server, Database, Cpu, HardDrive, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get('/system/health'); setHealth(res.data); } catch (e: any) { console.error('Error:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const metrics = [
    { label: 'CPU Usage', value: health?.cpu ? `${(health.cpu.usage || 0).toFixed(1)}%` : 'N/A', icon: <Cpu size={20} /> },
    { label: 'Memory', value: health?.memory ? `${(health.memory.usagePercent || 0).toFixed(1)}%` : 'N/A', icon: <HardDrive size={20} /> },
    { label: 'Database', value: health?.database?.status || 'N/A', icon: <Database size={20} />, status: true },
    { label: 'DB Source', value: health?.database?.source || 'N/A', icon: <Database size={20} />, status: true, badge: true },
    { label: 'DB Latency', value: health?.database?.latency ? `${health.database.latency}ms` : 'N/A', icon: <Wifi size={20} /> },
    { label: 'API Uptime', value: health?.api ? `${Math.round(health.api.uptime / 60)} min` : 'N/A', icon: <Server size={20} /> },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Health</h1>
        <button className="btn btn-primary btn-sm" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Platform monitoring. Click Refresh to check status</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {metrics.map((m, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{m.label}</span>
              <div style={{ color: 'var(--primary)', opacity: 0.7 }}>{m.icon}</div>
            </div>
            {m.status ? (
              <span className={`badge ${m.badge ? (m.value === 'fallback' ? 'badge-error' : 'badge-success') : (m.value === 'connected' ? 'badge-success' : 'badge-error')}`} style={{ fontSize: '1rem', textTransform: 'uppercase' }}>{m.value}</span>
            ) : (
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{m.value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>System Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: health?.status === 'healthy' ? 'var(--success)' : health?.status === 'degraded' ? 'var(--warning)' : 'var(--error)' }} />
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{health?.status || 'Unknown'}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Last checked: {health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : 'N/A'}</span>
        </div>
        {health?.database?.source === 'fallback' && (
          <p style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: '#2e0505', color: '#f87171', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={14} /> PRIMARY DATABASE UNREACHABLE. Running on the fallback database
          </p>
        )}
      </div>
    </div>
  );
}