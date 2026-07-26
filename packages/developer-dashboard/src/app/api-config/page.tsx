'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Key, Eye, EyeOff, Check, X, RefreshCw, Save, AlertCircle, Wifi, WifiOff, Globe, Mail, CreditCard, Lock, Database, Camera, Smartphone, Server, Zap, BookOpen, Brain, Map, Shield, BarChart3, Bug, HardDrive } from 'lucide-react';

interface IntegrationService {
  category: string;
  icon: any;
  services: {
    name: string;
    keys: { key: string; label: string; type: 'password' | 'text' | 'number' }[];
  }[];
}

const INTEGRATIONS: IntegrationService[] = [
  {
    category: 'Authentication', icon: <Lock size={18} />,
    services: [
      { name: 'Google OAuth', keys: [{ key: 'GOOGLE_OAUTH_CLIENT_ID', label: 'Client ID', type: 'text' }, { key: 'GOOGLE_OAUTH_CLIENT_SECRET', label: 'Client Secret', type: 'password' }] },
      { name: 'Facebook OAuth', keys: [{ key: 'FACEBOOK_OAUTH_CLIENT_ID', label: 'App ID', type: 'text' }, { key: 'FACEBOOK_OAUTH_CLIENT_SECRET', label: 'App Secret', type: 'password' }] },
      { name: 'Apple Sign-In', keys: [{ key: 'APPLE_SIGN_IN_CLIENT_ID', label: 'Client ID', type: 'text' }, { key: 'APPLE_SIGN_IN_KEY_ID', label: 'Key ID', type: 'text' }, { key: 'APPLE_SIGN_IN_TEAM_ID', label: 'Team ID', type: 'text' }] },
      { name: 'GitHub OAuth', keys: [{ key: 'GITHUB_OAUTH_CLIENT_ID', label: 'Client ID', type: 'text' }, { key: 'GITHUB_OAUTH_CLIENT_SECRET', label: 'Client Secret', type: 'password' }] },
    ],
  },
  {
    category: 'Storage & Media', icon: <Camera size={18} />,
    services: [
      { name: 'Cloudinary', keys: [{ key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloud Name', type: 'text' }, { key: 'CLOUDINARY_API_KEY', label: 'API Key', type: 'text' }, { key: 'CLOUDINARY_API_SECRET', label: 'API Secret', type: 'password' }] },
      { name: 'AWS S3', keys: [{ key: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', type: 'text' }, { key: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', type: 'password' }, { key: 'AWS_S3_REGION', label: 'Region', type: 'text' }, { key: 'AWS_S3_BUCKET', label: 'Bucket Name', type: 'text' }] },
      { name: 'Firebase', keys: [{ key: 'FIREBASE_API_KEY', label: 'API Key', type: 'text' }, { key: 'FIREBASE_PROJECT_ID', label: 'Project ID', type: 'text' }, { key: 'FIREBASE_PRIVATE_KEY', label: 'Private Key', type: 'password' }] },
      { name: 'Supabase', keys: [{ key: 'SUPABASE_URL', label: 'Project URL', type: 'text' }, { key: 'SUPABASE_ANON_KEY', label: 'Anon Key', type: 'password' }, { key: 'SUPABASE_SERVICE_KEY', label: 'Service Key', type: 'password' }] },
    ],
  },
  {
    category: 'Payments', icon: <CreditCard size={18} />,
    services: [
      { name: 'Stripe', keys: [{ key: 'STRIPE_PUBLISHABLE_KEY', label: 'Publishable Key', type: 'text' }, { key: 'STRIPE_SECRET_KEY', label: 'Secret Key', type: 'password' }, { key: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password' }] },
      { name: 'Flutterwave', keys: [{ key: 'FLUTTERWAVE_PUBLIC_KEY', label: 'Public Key', type: 'text' }, { key: 'FLUTTERWAVE_SECRET_KEY', label: 'Secret Key', type: 'password' }, { key: 'FLUTTERWAVE_WEBHOOK_SECRET', label: 'Webhook Secret', type: 'password' }] },
      { name: 'Paystack', keys: [{ key: 'PAYSTACK_PUBLIC_KEY', label: 'Public Key', type: 'text' }, { key: 'PAYSTACK_SECRET_KEY', label: 'Secret Key', type: 'password' }] },
      { name: 'Airtel Money', keys: [{ key: 'AIRTEL_MONEY_API_KEY', label: 'API Key', type: 'password' }, { key: 'AIRTEL_MONEY_USERNAME', label: 'Username', type: 'text' }] },
      { name: 'MTN MoMo', keys: [{ key: 'MTN_MOMO_API_KEY', label: 'API Key', type: 'password' }, { key: 'MTN_MOMO_API_USER', label: 'API User', type: 'text' }, { key: 'MTN_MOMO_SUBSCRIPTION_KEY', label: 'Subscription Key', type: 'password' }] },
      { name: 'Pesapal', keys: [{ key: 'PESAPAL_CONSUMER_KEY', label: 'Consumer Key', type: 'text' }, { key: 'PESAPAL_CONSUMER_SECRET', label: 'Consumer Secret', type: 'password' }] },
    ],
  },
  {
    category: 'Email & Notifications', icon: <Mail size={18} />,
    services: [
      { name: 'SMTP', keys: [{ key: 'SMTP_HOST', label: 'Host', type: 'text' }, { key: 'SMTP_PORT', label: 'Port', type: 'number' }, { key: 'SMTP_USER', label: 'Username', type: 'text' }, { key: 'SMTP_PASS', label: 'Password', type: 'password' }, { key: 'SMTP_FROM', label: 'From Address', type: 'text' }] },
      { name: 'Resend', keys: [{ key: 'RESEND_API_KEY', label: 'API Key', type: 'password' }] },
      { name: 'Mailgun', keys: [{ key: 'MAILGUN_API_KEY', label: 'API Key', type: 'password' }, { key: 'MAILGUN_DOMAIN', label: 'Domain', type: 'text' }] },
      { name: 'Twilio (SMS)', keys: [{ key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', type: 'text' }, { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', type: 'password' }, { key: 'TWILIO_PHONE_NUMBER', label: 'Phone Number', type: 'text' }] },
    ],
  },
  {
    category: 'AI & Language', icon: <Brain size={18} />,
    services: [
      { name: 'OpenAI', keys: [{ key: 'OPENAI_API_KEY', label: 'API Key', type: 'password' }] },
      { name: 'Anthropic', keys: [{ key: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'password' }] },
      { name: 'Google Gemini', keys: [{ key: 'GOOGLE_GEMINI_API_KEY', label: 'API Key', type: 'password' }] },
      { name: 'HuggingFace', keys: [{ key: 'HUGGINGFACE_API_KEY', label: 'API Key', type: 'password' }] },
    ],
  },
  {
    category: 'Maps & Location', icon: <Map size={18} />,
    services: [
      { name: 'Mapbox', keys: [{ key: 'MAPBOX_ACCESS_TOKEN', label: 'Access Token', type: 'password' }] },
      { name: 'Google Maps', keys: [{ key: 'GOOGLE_MAPS_API_KEY', label: 'API Key', type: 'password' }] },
    ],
  },
  {
    category: 'Security', icon: <Shield size={18} />,
    services: [
      { name: 'reCAPTCHA', keys: [{ key: 'RECAPTCHA_SITE_KEY', label: 'Site Key', type: 'text' }, { key: 'RECAPTCHA_SECRET_KEY', label: 'Secret Key', type: 'password' }] },
      { name: 'Cloudflare', keys: [{ key: 'CLOUDFLARE_API_TOKEN', label: 'API Token', type: 'password' }, { key: 'CLOUDFLARE_ZONE_ID', label: 'Zone ID', type: 'text' }] },
    ],
  },
  {
    category: 'Monitoring', icon: <BarChart3 size={18} />,
    services: [
      { name: 'Analytics (GA)', keys: [{ key: 'ANALYTICS_GA_ID', label: 'Measurement ID', type: 'text' }] },
      { name: 'Sentry', keys: [{ key: 'SENTRY_DSN', label: 'DSN', type: 'password' }] },
    ],
  },
  {
    category: 'Infrastructure', icon: <Server size={18} />,
    services: [
      { name: 'Redis', keys: [{ key: 'REDIS_URL', label: 'Connection URL', type: 'password' }] },
    ],
  },
];

type TestResult = { key: string; success: boolean; message: string; timestamp: string } | null;

export default function ApiConfigPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [lastTested, setLastTested] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<any>('/api-config'),
      api.get<any>('/settings'),
    ]).then(([cfg, _settings]: [any, any]) => {
      const vals: Record<string, string> = {};
      const enabledVals: Record<string, boolean> = {};
      const testedVals: Record<string, string> = {};
      for (const group of INTEGRATIONS) {
        for (const svc of group.services) {
          const enabledKey = `${svc.keys[0].key.split('_')[0]}_ENABLED`;
          enabledVals[svc.name] = cfg.data?.[enabledKey] === true || cfg.data?.[enabledKey] === 'true';
          for (const k of svc.keys) {
            vals[k.key] = cfg.data?.[k.key]?.toString() || '';
          }
        }
      }
      for (const [key, val] of Object.entries(cfg.data || {})) {
        if (key.endsWith('_LAST_TESTED')) testedVals[key] = val as string;
      }
      setConfig(vals);
      setEnabled(enabledVals);
      setLastTested(testedVals);
    }).catch((e: any) => console.error('Failed to load config:', e)).finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api-config', config);
      for (const [name, val] of Object.entries(enabled)) {
        const prefix = INTEGRATIONS.flatMap(g => g.services).find(s => s.name === name)?.keys[0].key.split('_')[0];
        if (prefix) await api.put('/settings', { [`${prefix}_ENABLED`]: val });
      }
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save' });
    } finally { setSaving(false); }
  };

  const testConnection = async (key: string) => {
    setTesting(p => ({ ...p, [key]: true }));
    setTestResult(null);
    try {
      const r: any = await api.post(`/api-config/test/${key}`);
      setTestResult(r.data);
    } catch (e: any) {
      setTestResult({ key, success: false, message: e?.message || 'Test failed', timestamp: new Date().toISOString() });
    } finally { setTesting(p => ({ ...p, [key]: false })); }
  };

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading configuration...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>API & Integrations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configure all third-party services and API keys for the platform</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: message.type === 'success' ? '#052e16' : '#2e0505', color: message.type === 'success' ? '#4ade80' : '#f87171', border: `1px solid ${message.type === 'success' ? '#4ade80' : '#f87171'}` }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />} {message.text}
        </div>
      )}

      {testResult && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: testResult.success ? '#052e16' : '#2e0505', color: testResult.success ? '#4ade80' : '#f87171', border: `1px solid ${testResult.success ? '#4ade80' : '#f87171'}` }}>
          {testResult.success ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span><strong>{testResult.key}</strong>: {testResult.message}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: '0.75rem' }}>{new Date(testResult.timestamp).toLocaleTimeString()}</span>
        </div>
      )}

      {INTEGRATIONS.map(category => (
        <div key={category.category} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            {category.icon} {category.category}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {category.services.map(svc => {
              const firstKey = svc.keys[0].key;
              const isConfigured = svc.keys.some(k => config[k.key]?.length > 3);
              return (
                <div key={svc.name} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{svc.name}</h3>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', background: isConfigured ? '#052e16' : '#2e0505', color: isConfigured ? '#4ade80' : '#f87171' }}>
                        {isConfigured ? <Wifi size={10} /> : <WifiOff size={10} />} {isConfigured ? 'Configured' : 'Not Set'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {lastTested[`${firstKey.split('_')[0]}_LAST_TESTED`] && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Tested: {new Date(lastTested[`${firstKey.split('_')[0]}_LAST_TESTED`]).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => testConnection(firstKey)}
                        disabled={testing[firstKey]}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                      >
                        {testing[firstKey] ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />} Test
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {svc.keys.map(k => (
                      <div key={k.key}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>{k.label}</label>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <input
                            type={revealed[k.key] ? 'text' : k.type}
                            value={config[k.key] || ''}
                            onChange={e => setConfig(p => ({ ...p, [k.key]: e.target.value }))}
                            placeholder={`Enter ${k.label}`}
                            className="input"
                            style={{ flex: 1, fontFamily: k.type === 'password' && !revealed[k.key] ? 'inherit' : 'monospace' }}
                          />
                          {k.type === 'password' && (
                            <button className="btn btn-ghost btn-icon" onClick={() => setRevealed(p => ({ ...p, [k.key]: !p[k.key] }))} title={revealed[k.key] ? 'Hide' : 'Show'}>
                              {revealed[k.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
