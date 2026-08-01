'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MailCheck, AlertCircle } from 'lucide-react';

export default function MagicLinkPage() {
  const searchParams = useSearchParams();
  const { completeSession } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (!token || !email) {
      setStatus('error');
      setError('Invalid or missing sign-in link.');
      return;
    }
    done.current = true;
    api.post<any>('/auth/magic-link/verify', { token, email })
      .then((res: any) => {
        setStatus('success');
        completeSession(res.data);
      })
      .catch((e: any) => {
        setStatus('error');
        setError(e?.message || 'This link is invalid or has expired.');
      });
  }, [searchParams, completeSession]);

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(1.5rem, 4vw, 2.5rem)', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <MailCheck size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Signing you in...</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Verifying your sign-in link</p>
          </>
        )}
        {status === 'success' && (
          <>
            <MailCheck size={40} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>You&apos;re in!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Redirecting to your account...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Link expired</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{error}</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Request a new link</Link>
          </>
        )}
      </div>
    </div>
  );
}
