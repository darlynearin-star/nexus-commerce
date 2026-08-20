'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(email, password); router.push('/dashboard'); } catch (err: any) { setError(err.message); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '2.5rem' }}>
        <img src="/lynnyx-logo-portrait.png" alt="Lyn-nyx Dev" style={{ display: 'block', margin: '0 auto 1.25rem', maxWidth: 150, maxHeight: 130, objectFit: 'contain' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Lyn-nyx Dev Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>Full platform administration</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input" type="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" aria-label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}