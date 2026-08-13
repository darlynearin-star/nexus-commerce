'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const { completeSession } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    if (!accessToken || !refreshToken) {
      done.current = true;
      setStatus('error');
      setError('Sign-in did not complete. Please try again.');
      return;
    }
    done.current = true;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    api.get<any>('/auth/me').then((res: any) => {
      completeSession({ user: res.data, accessToken, refreshToken });
    }).catch(() => {
      setStatus('error');
      setError('Could not load your account. Please try again.');
    });
  }, [searchParams, completeSession]);

  return (
    <div className="container" style={{ padding: 'clamp(2rem, 6vw, 4rem) 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 'clamp(1.5rem, 4vw, 2.5rem)', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <Loader2 size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} className="spin" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Completing sign-in...</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Please wait</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{error}</p>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Back to login</Link>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
