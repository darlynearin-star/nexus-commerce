'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(searchParams.get('token') || '');
    setEmail(searchParams.get('email') || '');
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters with both letters and numbers.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm', { token, email, newPassword: password });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'This link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Password updated</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>You can now sign in with your new password.</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>Sign in</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} color="var(--primary)" /> Reset password
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              {email ? <>Choose a new password for <strong>{email}</strong>.</> : 'Choose a new password for your account.'}
            </p>
            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="newPassword" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>New Password</label>
                <input id="newPassword" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars, letters & numbers" required />
              </div>
              <div>
                <label htmlFor="confirmPassword" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Confirm Password</label>
                <input id="confirmPassword" type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your new password" required />
              </div>
              <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              Changed your mind? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}