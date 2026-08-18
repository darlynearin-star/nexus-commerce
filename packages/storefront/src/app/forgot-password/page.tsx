'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KeyRound, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send the reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card auth-card">
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your inbox</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              If {email} is registered, a password reset link has been sent. It expires in 30 minutes.
            </p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} color="var(--primary)" /> Forgot password?
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Enter your account email and we&apos;ll send you a link to reset your password.
            </p>
            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="resetEmail" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label>
                <input id="resetEmail" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : <Mail size={16} />} Send Reset Link
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Remembered it? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
      <style>{`
        .auth-card { width: 100%; max-width: 420px; padding: clamp(1.5rem, 4vw, 2.5rem); }
        @media (max-width: 480px) { .auth-card { border-radius: 0.5rem; } }
        @keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}