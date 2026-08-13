'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MailCheck, Loader2 } from 'lucide-react';

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResending(true); setError(''); setResent(false);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not resend the email');
    } finally { setResending(false); }
  };

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(1.5rem, 4vw, 2.5rem)', textAlign: 'center' }}>
        <MailCheck size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your inbox</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          We sent a verification link to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Click it to activate your account, then sign in.
        </p>

        {resent && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>Verification email sent again. Check your inbox.</p>}
        {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

        <button className="btn btn-secondary" onClick={handleResend} disabled={resending} style={{ justifyContent: 'center', width: '100%', marginBottom: '0.75rem' }}>
          {resending ? <Loader2 size={16} className="spin" /> : <MailCheck size={16} />} Resend verification email
        </button>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already verified? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
