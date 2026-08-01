'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Download, Check, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearCache = async () => {
    setWorking('cache'); setMessage(null);
    try {
      await api.delete('/cache');
      setMessage({ type: 'success', text: 'Application cache cleared' });
    } catch (e: any) { setMessage({ type: 'error', text: e?.message || 'Failed to clear cache' }); }
    finally { setWorking(''); }
  };

  const createBackup = async () => {
    setWorking('backup'); setMessage(null);
    try {
      const r: any = await api.post('/backups/create');
      setMessage({ type: 'success', text: `Backup created: ${r.data.rowCount} rows across ${r.data.tableCount} tables (${(r.data.size / 1024).toFixed(1)} KB)` });
    } catch (e: any) { setMessage({ type: 'error', text: e?.message || 'Backup failed' }); }
    finally { setWorking(''); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Global Settings</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Application configuration</p>
      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.type === 'success' ? '#052e16' : '#2e0505', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Application Config</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Application-level configuration is managed in the API Configuration section.</p>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Cache Management</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Clear the in-memory application cache</p>
          <button className="btn btn-secondary btn-sm" onClick={clearCache} disabled={working === 'cache'}>
            <RefreshCw size={14} /> {working === 'cache' ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Backup</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Create a snapshot of all database tables</p>
          <button className="btn btn-primary btn-sm" onClick={createBackup} disabled={working === 'backup'}>
            <Download size={14} /> {working === 'backup' ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
