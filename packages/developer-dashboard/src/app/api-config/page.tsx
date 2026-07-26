'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Key, CreditCard, Mail, Globe, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';

const PROVIDER_FIELDS = [
  { key: 'FLUTTERWAVE_SECRET_KEY', label: 'Flutterwave Secret Key', icon: <CreditCard size={16} />, provider: 'Flutterwave', type: 'password' },
  { key: 'MTN_MOMO_API_KEY', label: 'MTN MoMo API Key', icon: <Key size={16} />, provider: 'MTN MoMo', type: 'password' },
  { key: 'MTN_MOMO_API_USER', label: 'MTN MoMo API User', icon: <Key size={16} />, provider: 'MTN MoMo', type: 'text' },
  { key: 'AIRTEL_MONEY_API_KEY', label: 'Airtel Money API Key', icon: <Key size={16} />, provider: 'Airtel Money', type: 'password' },
  { key: 'AIRTEL_MONEY_USERNAME', label: 'Airtel Money Username', icon: <Key size={16} />, provider: 'Airtel Money', type: 'text' },
  { key: 'PLATFORM_EMAIL_FROM', label: 'Email From Address', icon: <Mail size={16} />, provider: 'Email', type: 'email' },
  { key: 'PLATFORM_EMAIL_HOST', label: 'SMTP Host', icon: <Globe size={16} />, provider: 'Email', type: 'text' },
  { key: 'PLATFORM_EMAIL_PORT', label: 'SMTP Port', icon: <Globe size={16} />, provider: 'Email', type: 'number' },
];

export default function ApiConfigPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<any>('/api-config').then((r: any) => {
      const vals: Record<string, string> = {};
      for (const field of PROVIDER_FIELDS) vals[field.key] = r.data?.[field.key]?.toString() || '';
      setConfig(vals);
    }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api-config', config);
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading configuration...</div>;

  const providers = [...new Set(PROVIDER_FIELDS.map(f => f.provider))];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>API Configuration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage integration keys and provider settings</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: message.type === 'success' ? 'var(--success-bg, #052e16)' : 'var(--error-bg, #2e0505)', color: message.type === 'success' ? 'var(--success, #4ade80)' : 'var(--error, #f87171)', border: `1px solid ${message.type === 'success' ? 'var(--success, #4ade80)' : 'var(--error, #f87171)'}` }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />} {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {providers.map(provider => (
          <div key={provider} className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>{provider} Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {PROVIDER_FIELDS.filter(f => f.provider === provider).map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>{field.icon} {field.label}</span>
                  </label>
                  <input
                    type={field.type}
                    value={config[field.key] || ''}
                    onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={`Enter ${field.label}`}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
