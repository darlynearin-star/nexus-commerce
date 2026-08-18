'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [action, setAction] = useState('');
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });

  const load = async (p: number, a: string) => {
    setLoading(true);
    try {
      const r: any = await api.get('/activity-logs', { page: p, limit, action: a || undefined });
      setLogs(r.data);
      setMeta(r.meta || { total: 0, totalPages: 1 });
      setPage(p);
    } catch (e) { console.error('API error:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, ''); }, []);

  const from = logs.length === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + logs.length;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Activity Logs</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>All platform activity recorded with timestamps</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 1 320px', minWidth: 220 }}>
          <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            className="form-input"
            placeholder="Filter by action (e.g. user:login)"
            aria-label="Filter by action"
            value={action}
            onChange={e => { setAction(e.target.value); load(1, e.target.value); }}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing {from}–{to} of {meta.total} events
        </div>
      </div>

      {loading ? <div className="card"><div className="skeleton" style={{ height: 400 }} /></div> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container"><table className="table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{log.user?.email || 'Unknown'}</td>
                  <td><span className="badge badge-info">{log.action}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{log.resource} {log.resourceId ? `#${log.resourceId.slice(0, 8)}` : ''}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No activity logs match this filter</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => load(page - 1, action)} disabled={loading || page <= 1} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ChevronLeft size={16} /> Prev
        </button>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Page {page} of {Math.max(1, meta.totalPages)}</span>
        <button className="btn btn-ghost" onClick={() => load(page + 1, action)} disabled={loading || page >= meta.totalPages} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
