'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(email, password); } catch (err: any) { setError(err.message); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '2.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Lyn-nyx Retailer Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Sign in to manage your store</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input" type="email" name="email" id="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" name="password" id="password" placeholder="Password" aria-label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}