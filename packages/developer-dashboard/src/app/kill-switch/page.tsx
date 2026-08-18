'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Power, PowerOff } from 'lucide-react';

const switches = [
  { key: 'storefront', label: 'Storefront', desc: 'Disable the entire customer storefront' },
  { key: 'retailerDashboard', label: 'Retailer Dashboard', desc: 'Disable retailer dashboard access' },
  { key: 'customerRegistration', label: 'Customer Registration', desc: 'Disable new user registration' },
  { key: 'checkout', label: 'Checkout', desc: 'Disable checkout process' },
  { key: 'orders', label: 'Orders', desc: 'Disable order processing' },
  { key: 'uploads', label: 'Uploads', desc: 'Disable file uploads' },
  { key: 'payments', label: 'Payments', desc: 'Disable payment processing' },
  { key: 'apis', label: 'APIs', desc: 'Disable all API endpoints' },
  { key: 'search', label: 'Search', desc: 'Disable search functionality' },
  { key: 'maintenance', label: 'Maintenance Mode', desc: 'Enable maintenance mode with custom message' },
];

export default function KillSwitchPage() {
  const [state, setState] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/kill-switch').then((r: any) => {
      setState(r.data);
      setMessage(r.data.maintenanceMessage || '');
    }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string) => {
    const newVal = !state[key];
    await api.put('/kill-switch', { [key]: newVal, ...(key === 'maintenance' && newVal ? { maintenanceMessage: message } : {}) });
    setState((prev: any) => ({ ...prev, [key]: newVal }));
  };

  const updateMessage = async () => {
    await api.put('/kill-switch', { maintenanceMessage: message });
  };

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: 28, width: '35%' }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );

  const activeCount = switches.filter(s => state[s.key] === true).length;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <AlertTriangle size={28} color="var(--danger)" />
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Emergency Kill Switch</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Instantly disable platform features</p></div>
      </div>
      {activeCount > 0 && (
        <div className="kill-switch-card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{activeCount} system(s) currently disabled</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>These changes take effect immediately without server restart.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {switches.map(s => (
          <div key={s.key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: state[s.key] ? '2px solid var(--danger)' : '1px solid var(--border)' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{s.label}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{s.desc}</p>
              <span className={`badge ${state[s.key] ? 'badge-error' : 'badge-success'}`} style={{ marginTop: '0.375rem' }}>
                {state[s.key] ? 'Disabled' : 'Active'}
              </span>
            </div>
            <button className={`btn ${state[s.key] ? 'btn-danger' : 'btn-secondary'} btn-sm`} onClick={() => toggle(s.key)}>
              {state[s.key] ? <PowerOff size={16} /> : <Power size={16} />}
              {state[s.key] ? 'Enable' : 'Disable'}
            </button>
          </div>
        ))}
      </div>

      {/* Maintenance Message */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Maintenance Page Message</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Custom maintenance message..." aria-label="Maintenance message" />
          <button className="btn btn-primary btn-sm" onClick={updateMessage}>Save</button>
        </div>
      </div>
    </div>
  );
}