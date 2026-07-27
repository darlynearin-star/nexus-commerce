'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Save, Power, ExternalLink, Eye, Image } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<any>('/store-settings'),
      api.get<any>('/stores/mine'),
    ]).then(([sRes, storeRes]: [any, any]) => {
      setSettings(sRes.data || {});
      setStore(storeRes.data);
      setLogoUrl(storeRes.data?.logoUrl || '');
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

  const saveBranding = async () => {
    setBrandSaving(true);
    try {
      const r: any = await api.put(`/stores/${store.id}`, { logoUrl: logoUrl || null });
      setStore(r.data);
      setMessage('Branding saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save branding');
    } finally { setBrandSaving(false); }
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


      </div>

      {/* Branding Section */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Image size={18} /> Store Branding
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Upload a logo image or leave empty to use your store name as text. Recommended: rectangular image, max 400px wide.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Logo URL</label>
            <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
          </div>
          {logoUrl && (
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Preview</label>
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <img src={logoUrl} alt="Logo preview" style={{ maxHeight: 60, maxWidth: 300, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={saveBranding} disabled={brandSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Save size={14} /> {brandSaving ? 'Saving...' : 'Save Logo'}
            </button>
            {store?.logoUrl && (
              <button className="btn btn-ghost" onClick={async () => {
                setLogoUrl('');
                await api.put(`/stores/${store.id}`, { logoUrl: null });
                setStore((p: any) => ({ ...p, logoUrl: null }));
                setMessage('Logo removed');
                setTimeout(() => setMessage(''), 3000);
              }}>Remove Logo</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
