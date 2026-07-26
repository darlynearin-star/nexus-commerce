'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, Trash2, Database, Clock, HardDrive } from 'lucide-react';

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => { try { const r: any = await api.get('/backups'); setBackups(r.data || []); } catch (e: any) { console.error('Failed:', e); } };

  const create = async () => {
    setCreating(true); setMessage('');
    try {
      const r: any = await api.post('/backups/create');
      setMessage(`Backup created: ${r.data.rowCount} rows across ${r.data.tableCount} tables (${(r.data.size / 1024).toFixed(1)} KB)`);
      load();
    } catch (e: any) { setMessage('Error: ' + (e?.message || e?.error || 'Unknown')); }
    finally { setCreating(false); }
  };

  const remove = async (id: string) => { try { await api.delete(`/backups/${id}`); load(); } catch (e: any) { console.error('Failed:', e); } };

  const download = async (id: string) => {
    try {
      const r: any = await api.get(`/backups/${id}/download`);
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `nexus-backup-${id.slice(0, 20)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { console.error('Failed:', e); }
  };

  const formatSize = (bytes: number) => { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Database Backups</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Create, download, and manage logical database snapshots</p></div>
        <button className="btn btn-primary" onClick={create} disabled={creating}><Database size={16} /> {creating ? 'Creating...' : 'Create Backup'}</button>
      </div>

      {message && <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.startsWith('Error') ? '#2e0505' : '#052e16', color: message.startsWith('Error') ? '#f87171' : '#4ade80' }}>{message}</div>}

      <div className="card">
        {backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Database size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No backups yet. Click "Create Backup" to take your first snapshot.</p>
          </div>
        ) : (
          <table className="table"><thead><tr><th>Backup ID</th><th>Date</th><th>Tables</th><th>Rows</th><th>Size</th><th></th></tr></thead>
            <tbody>{backups.map(b => (
              <tr key={b.id}><td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{b.id.slice(0, 24)}...</td>
                <td style={{ fontSize: '0.875rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={14} />{new Date(b.createdAt).toLocaleString()}</div></td>
                <td style={{ fontSize: '0.875rem' }}>{b.tableCount}</td>
                <td style={{ fontSize: '0.875rem' }}>{b.rowCount?.toLocaleString()}</td>
                <td style={{ fontSize: '0.875rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><HardDrive size={14} />{formatSize(b.size)}</div></td>
                <td><div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => download(b.id)}><Download size={14} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(b.id)}><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
