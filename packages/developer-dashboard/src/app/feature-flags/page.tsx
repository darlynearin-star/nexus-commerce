'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ToggleLeft, ToggleRight } from 'lucide-react';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => { api.get('/system/feature-flags').then((r: any) => setFlags(r.data)).catch(() => {}); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    await api.put(`/system/feature-flags/${key}`, { enabled: !enabled });
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Feature Flags</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Toggle features on/off across the platform</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {flags.map(flag => (
          <div key={flag.key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{flag.name}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{flag.description}</p>
              <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{flag.key}</code>
            </div>
            <button className={`btn btn-ghost btn-icon`} onClick={() => toggle(flag.key, flag.enabled)} style={{ color: flag.enabled ? 'var(--success)' : 'var(--text-secondary)' }}>
              {flag.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}