'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Mail, ShieldCheck, Loader2, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault(); setMagicError(''); setMagicLoading(true);
    try {
      await api.post('/auth/magic-link', { email: magicEmail });
      setMagicSent(true);
    } catch (err: any) {
      setMagicError(err?.message || 'Could not send a sign-in link');
    } finally { setMagicLoading(false); }
  };

  const handleGoogle = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://nexus-api-69q5.onrender.com';
    window.location.href = `${base}/api/auth/google`;
  };

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card auth-card">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Sign in to your account</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button className="btn btn-secondary" onClick={handleGoogle} style={{ justifyContent: 'center', width: '100%', padding: '0.75rem', marginBottom: '1rem' }}>
          <ShieldCheck size={18} /> Continue with Google
        </button>

        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block' }}>Or sign in with a magic link</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" type="email" placeholder="you@email.com" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} required style={{ flex: 1 }} />
            <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} disabled={magicLoading}>
              {magicLoading ? <Loader2 size={16} className="spin" /> : <Mail size={16} />} Send Link
            </button>
          </div>
          {magicError && <p style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{magicError}</p>}
          {magicSent && <p style={{ color: 'var(--success)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle size={14} /> If that email is registered, a sign-in link has been sent.</p>}
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>Register</Link>
        </p>
        <div className="card" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.375rem' }}>Demo Accounts:</p>
          <p>Customer: customer@nexuscommerce.com / Password123!</p>
          <p>Retailer: retailer@nexuscommerce.com / Password123!</p>
          <p>Admin: admin@nexuscommerce.com / Password123!</p>
        </div>
      </div>
      <style>{`
        .auth-card { width: 100%; max-width: 420px; padding: clamp(1.5rem, 4vw, 2.5rem); }
        @media (max-width: 480px) {
          .auth-card { border-radius: 0.5rem; }
        }
        @keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
