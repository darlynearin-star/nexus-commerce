'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnvVars({
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.NEXT_PUBLIC_API_URL || '4000',
    });
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Global Settings</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Application configuration</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Application Config</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(envVars).map(([key, val]) => (
              <div key={key} style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{key}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'monospace' }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Cache Management</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Clear application cache</p>
          <button className="btn btn-secondary btn-sm">Clear Cache</button>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Backup</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Database backup management</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm">Create Backup</button>
            <button className="btn btn-secondary btn-sm">Restore</button>
          </div>
        </div>
      </div>
    </div>
  );
}