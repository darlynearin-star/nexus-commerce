'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }
    done.current = true;
    api.post<any>('/auth/verify-email', { token, email })
      .then((res: any) => {
        setStatus('success');
        setMessage(res?.message || 'Email verified!');
      })
      .catch((e: any) => {
        setStatus('error');
        setMessage(e?.message || 'This link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(1.5rem, 4vw, 2.5rem)', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} className="spin" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Verifying your email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <MailCheck size={40} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Email verified!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{message} You can now sign in.</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Sign In</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Verification failed</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{message}</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Back to Sign In</Link>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
