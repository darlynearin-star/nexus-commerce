'use client';
import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <Compass size={26} />
        </div>
      </div>
      <p style={{ fontSize: '0.8125rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.5rem' }}>Error 404</p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        Back to Dashboard
      </Link>
    </div>
  );
}