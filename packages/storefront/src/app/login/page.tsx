'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true); setUnverifiedEmail('');
    try { await login(email, password); } catch (err: any) {
      setError(err.message);
      if (err?.status === 403 && err?.message?.includes('verify your email')) setUnverifiedEmail(email);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true); setResent(false);
    try {
      await api.post('/auth/resend-verification', { email: unverifiedEmail });
      setResent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not resend the email');
    } finally { setResending(false); }
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
        <img src="/lynnyx-logo-portrait.png" alt="Lyn-nyx Stores" style={{ display: 'block', margin: '0 auto 1.25rem', maxWidth: 150, maxHeight: 130, objectFit: 'contain' }} />
        <p className="eyebrow" style={{ textAlign: 'center' }}>Account</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.375rem' }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Sign in to your account</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {unverifiedEmail && (
          <div style={{ padding: '0.75rem', background: 'var(--glow)', border: '1px solid var(--primary)', color: 'var(--text)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Please verify your email</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>A verification link was sent to <strong>{unverifiedEmail}</strong>. Click it to activate your account.</div>
            {resent && <div style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Verification email sent again. Check your inbox.</div>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleResend} disabled={resending}>
              {resending ? <Loader2 size={14} className="spin" /> : <Mail size={14} />} Resend verification email
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label htmlFor="loginEmail" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label><input id="loginEmail" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <label htmlFor="loginPassword" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>Forgot password?</Link>
          </div>
          <input id="loginPassword" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button className="btn btn-secondary" onClick={handleGoogle} style={{ justifyContent: 'center', width: '100%', padding: '0.75rem', marginBottom: '1rem' }}>
          <GoogleIcon /> Continue with Google
        </button>

        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="magicEmail" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block' }}>Or sign in with a magic link</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input id="magicEmail" className="input" type="email" placeholder="you@email.com" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} required style={{ flex: 1 }} />
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
