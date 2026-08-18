'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import GoogleIcon from '@/components/GoogleIcon';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'CUSTOMER' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';
    window.location.href = `${base}/api/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role }); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card auth-card">
        <p className="eyebrow">Account</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.375rem' }}>Create Account</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Join Lyn-nyx Stores today</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="name-fields">
            <div><label htmlFor="firstName" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>First Name</label><input id="firstName" className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
            <div><label htmlFor="lastName" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Last Name</label><input id="lastName" className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
          </div>
          <div><label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label><input id="email" className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label htmlFor="password" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Password</label><input id="password" className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
          <div><label htmlFor="confirmPassword" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Confirm Password</label><input id="confirmPassword" className="input" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required placeholder="Re-enter your password" /></div>
          <div>
            <label id="accountTypeLabel" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Account Type</label>
            <div className="role-buttons" role="radiogroup" aria-labelledby="accountTypeLabel">
              {[
                { value: 'CUSTOMER', label: 'Customer', desc: 'Browse & shop' },
                { value: 'RETAILER', label: 'Retailer', desc: 'Sell products' },
              ].map(opt => (
                <button key={opt.value} type="button" role="radio" aria-checked={form.role === opt.value} aria-label={opt.label} onClick={() => setForm({ ...form, role: opt.value })}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: `2px solid ${form.role === opt.value ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <button className="btn btn-secondary" onClick={handleGoogle} style={{ justifyContent: 'center', width: '100%', padding: '0.75rem' }}>
          <GoogleIcon /> Sign up with Google
        </button>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign In</Link>
        </p>
      </div>
      <style>{`
        .auth-card { width: 100%; max-width: 420px; padding: clamp(1.5rem, 4vw, 2.5rem); }
        .name-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .role-buttons { display: flex; gap: 0.5rem; }
        @media (max-width: 480px) {
          .auth-card { border-radius: 0.5rem; }
          .name-fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
