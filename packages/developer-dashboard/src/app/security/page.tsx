'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, Key, Eye, Ban } from 'lucide-react';

export default function SecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/activity-logs', { limit: 50, action: 'user:login' }).then((r: any) => setLogs(r.data)).catch((e: any) => console.error('API error:', e));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Security</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Security monitoring and configuration</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Shield size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>Rate Limiting</h3></div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>100 requests per 15 minutes per IP</p>
          <span className="badge badge-success">Active</span>
        </div>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Key size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>JWT Auth</h3></div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Access token: 15min | Refresh token: 7 days</p>
          <span className="badge badge-success">Active</span>
        </div>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Eye size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>Audit Logging</h3></div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>All important actions logged</p>
          <span className="badge badge-success">Active</span>
        </div>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Ban size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>IP Whitelist</h3></div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Coming soon</p>
          <span className="badge badge-warning">Planned</span>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Recent Login Activity</h3>
        <div className="table-container"><table className="table">
          <thead><tr><th>Time</th><th>User</th><th>IP</th></tr></thead>
          <tbody>
            {logs.slice(0, 10).map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td style={{ fontSize: '0.875rem' }}>{log.userEmail}</td>
                <td style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}