'use client';
import { Database, Download, Upload, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DatabasePage() {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    api.get('/system/health').then((r: any) => {
      setStatus(r.data?.database?.status === 'connected' ? 'Connected' : 'Disconnected');
    }).catch(() => setStatus('Error'));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Database</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Database management and maintenance</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><Database size={20} color="var(--primary)" /><h3 style={{ fontWeight: 600 }}>Status</h3></div>
          <span className={`badge ${status === 'Connected' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '1rem' }}>{status}</span>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Backup</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Create and restore database backups</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm"><Download size={14} /> Backup</button>
            <button className="btn btn-secondary btn-sm"><Upload size={14} /> Restore</button>
          </div>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Maintenance</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Optimize and clear database cache</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm"><RefreshCw size={14} /> Optimize</button>
            <button className="btn btn-secondary btn-sm">Clear Cache</button>
          </div>
        </div>
        <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Schema</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PostgreSQL with Prisma ORM</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tables: Users, Products, Orders, Customers, Categories, and more</p>
        </div>
      </div>
    </div>
  );
}