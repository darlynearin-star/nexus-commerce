'use client';
import { Database, Download, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DatabasePage() {
  const [status, setStatus] = useState('Checking...');
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/system/health').then((r: any) => {
      setStatus(r.data?.database?.status === 'connected' ? 'Connected' : 'Disconnected');
    }).catch(() => setStatus('Error'));
  }, []);

  const createBackup = async () => {
    setWorking('backup'); setMessage(null);
    try {
      const r: any = await api.post('/backups/create');
      setMessage({ type: 'success', text: `Backup created: ${r.data.rowCount} rows across ${r.data.tableCount} tables (${(r.data.size / 1024).toFixed(1)} KB)` });
    } catch (e: any) { setMessage({ type: 'error', text: e?.message || 'Backup failed' }); }
    finally { setWorking(''); }
  };

  const clearCache = async () => {
    setWorking('cache'); setMessage(null);
    try {
      await api.delete('/cache');
      setMessage({ type: 'success', text: 'Application cache cleared' });
    } catch (e: any) { setMessage({ type: 'error', text: e?.message || 'Failed to clear cache' }); }
    finally { setWorking(''); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Database</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Database management and maintenance</p>
      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.type === 'success' ? '#052e16' : '#2e0505', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Database size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>Status</h3></div>
          <span className={`badge ${status === 'Connected' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '1rem' }}>{status}</span>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Backup</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Create a snapshot of all database tables</p>
          <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={working === 'backup'}>
            <Download size={14} /> {working === 'backup' ? 'Creating...' : 'Backup'}
          </button>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Maintenance</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Clear the in-memory application cache</p>
          <button className="btn btn-secondary btn-sm" onClick={clearCache} disabled={working === 'cache'}>
            <RefreshCw size={14} /> {working === 'cache' ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Schema</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PostgreSQL with Prisma ORM</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tables: Users, Products, Orders, Customers, Categories, and more</p>
        </div>
      </div>
    </div>
  );
}
