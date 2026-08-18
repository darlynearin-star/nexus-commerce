'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Trash2, Database, Server, Activity } from 'lucide-react';

export default function CachePage() {
  const [data, setData] = useState<any>({ stats: {}, entries: [] });
  const [message, setMessage] = useState('');
  const [flushing, setFlushing] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => { try { const r: any = await api.get('/cache'); setData(r.data); } catch (e: any) { console.error('Failed:', e); } };

  const flushAll = async () => {
    setFlushing('all'); setMessage('');
    try { await api.delete('/cache'); setMessage('All cache cleared'); load(); } catch (e: any) { setMessage('Error: ' + (e?.message || 'Unknown')); }
    finally { setFlushing(''); }
  };

  const flushKey = async (key: string) => {
    setFlushing(key); setMessage('');
    try { await api.delete(`/cache?key=${encodeURIComponent(key)}`); setMessage(`Cache '${key}' cleared`); load(); } catch (e: any) { setMessage('Error: ' + (e?.message || 'Unknown')); }
    finally { setFlushing(''); }
  };

  const { stats, entries } = data;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cache Management</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>View and clear in-memory cache entries</p></div>

      {message && <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.startsWith('Error') ? '#2e0505' : '#052e16', color: message.startsWith('Error') ? '#f87171' : '#4ade80' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Total Entries</span><Database size={18} style={{ opacity: 0.5 }} /></div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.totalEntries || 0}</p></div>
        <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Active</span><Activity size={18} style={{ opacity: 0.5, color: 'var(--success)' }} /></div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{stats.activeEntries || 0}</p></div>
        <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Expired</span><Server size={18} style={{ opacity: 0.5, color: 'var(--error)' }} /></div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--error)' }}>{stats.expiredEntries || 0}</p></div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600 }}>Cache Entries</h3>
          <button className="btn btn-danger btn-sm" onClick={flushAll} disabled={flushing === 'all'}><Trash2 size={14} /> {flushing === 'all' ? 'Clearing...' : 'Flush All'}</button>
        </div>
        {entries.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No cache entries</p> : (
          <div className="table-container"><table className="table"><thead><tr><th>Key</th><th>TTL (ms)</th><th>Age (ms)</th><th>Status</th><th></th></tr></thead>
            <tbody>{entries.map((e: any) => (
              <tr key={e.key}><td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{e.key}</td>
                <td style={{ fontSize: '0.875rem' }}>{e.ttl}</td>
                <td style={{ fontSize: '0.875rem' }}>{e.age}</td>
                <td><span className={`badge ${e.expired ? 'badge-error' : 'badge-success'}`}>{e.expired ? 'Expired' : 'Active'}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => flushKey(e.key)} disabled={flushing === e.key} aria-label="Clear cache entry">{flushing === e.key ? '...' : <RefreshCw size={14} />}</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
