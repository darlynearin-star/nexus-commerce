'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/activity-logs', { limit: 100 }).then((r: any) => setLogs(r.data)).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false)); }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Activity Logs</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>All platform activity recorded with timestamps</p>
      {loading ? <div className="card"><div className="skeleton" style={{ height: 400 }} /></div> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{log.userEmail}</td>
                  <td><span className="badge badge-info">{log.action}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{log.resource} {log.resourceId ? `#${log.resourceId.slice(0, 8)}` : ''}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No activity logs yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}