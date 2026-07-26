'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Sign in to your account</p>
        {error && <div style={{ padding: '0.75rem', background: 'var(--error)', color: 'white', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
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
    </div>
  );
}
