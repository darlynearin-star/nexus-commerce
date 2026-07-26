'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => { api.get('/settings').then((r: any) => setSettings(r.data)).catch((e: any) => console.error('API error:', e)); }, []);

  const updateSetting = async (key: string, value: any) => {
    await api.put('/settings', { [key]: value });
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Store Settings</h1>
      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { key: 'store_name', label: 'Store Name' },
            { key: 'store_tagline', label: 'Tagline' },
            { key: 'store_email', label: 'Store Email' },
            { key: 'store_phone', label: 'Phone' },
            { key: 'store_address', label: 'Address' },
            { key: 'currency', label: 'Currency' },
            { key: 'tax_rate', label: 'Tax Rate' },
            { key: 'shipping_free_threshold', label: 'Free Shipping Threshold' },
            { key: 'shipping_standard_rate', label: 'Standard Shipping Rate' },
          ].map(field => (
            <div key={field.key}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>{field.label}</label>
              <input className="input" value={settings[field.key] || ''} onChange={e => setSettings((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                onBlur={() => { const val = settings[field.key]; if (val !== undefined) updateSetting(field.key, isNaN(Number(val)) ? val : Number(val)); }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}