'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Save, Power, ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<any>('/store-settings'),
      api.get<any>('/stores/mine'),
    ]).then(([sRes, storeRes]: [any, any]) => {
      setSettings(sRes.data || {});
      setStore(storeRes.data);
    }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/store-settings', settings);
      setMessage('Settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const toggleStore = async () => {
    try {
      const r: any = await api.post(`/stores/${store?.id}/toggle`);
      setStore(r.data);
    } catch (e: any) {
      console.error('Toggle failed:', e);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading settings...</div>;

  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000';
  const storeSlug = localStorage.getItem('activeStoreSlug');

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Store Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage your store configuration</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {store && (
            <button onClick={toggleStore} className={`btn btn-sm ${store?.isActive ? 'btn-secondary' : 'btn-primary'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Power size={14} /> {store?.isActive ? 'Pause Store' : 'Resume Store'}
            </button>
          )}
          {storeSlug && (
            <Link href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Eye size={14} /> Preview Store
            </Link>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', background: message.includes('Saved') ? '#052e16' : '#2e0505', color: message.includes('Saved') ? '#4ade80' : '#f87171' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>General</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Currency</label>
              <input className="input" value={settings.currency || 'UGX'} onChange={e => setSettings((p: any) => ({ ...p, currency: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Tax Rate (%)</label>
              <input className="input" type="number" value={settings.taxRate || 18} onChange={e => setSettings((p: any) => ({ ...p, taxRate: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Location</label>
              <input className="input" value={settings.location || 'Kampala, Uganda'} onChange={e => setSettings((p: any) => ({ ...p, location: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Shipping</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Free Shipping Threshold (UGX)</label>
              <input className="input" type="number" value={settings.shippingThreshold || 150000} onChange={e => setSettings((p: any) => ({ ...p, shippingThreshold: parseFloat(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Standard Shipping Rate (UGX)</label>
              <input className="input" type="number" value={settings.shippingRate || 15000} onChange={e => setSettings((p: any) => ({ ...p, shippingRate: parseFloat(e.target.value) }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
