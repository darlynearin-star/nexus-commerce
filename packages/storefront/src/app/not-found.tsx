'use client';
import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(4rem, 10vw, 6rem) 1rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <Compass size={28} />
        </div>
      </div>
      <p className="eyebrow">Error 404</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.01em', marginBottom: '0.75rem' }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
        The page you are looking for does not exist or has moved. Head back to the storefront to keep browsing.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-primary" style={{ fontSize: '0.9375rem', padding: '0.6875rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          Back to Home
        </Link>
        <Link href="/shop" className="btn btn-secondary" style={{ fontSize: '0.9375rem', padding: '0.6875rem 1.5rem' }}>
          Browse the Shop
        </Link>
      </div>
    </div>
  );
}