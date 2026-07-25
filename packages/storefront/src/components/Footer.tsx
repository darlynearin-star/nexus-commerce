'use client';
import Link from 'next/link';
import { Gem } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function Footer() {
  const { isDark } = useTheme();

  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '3rem 0', marginTop: '3rem' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
            <Gem size={24} />
            <span className={isDark ? 'gold-shimmer' : ''}>Adorn</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>Your Style, Elevated. Premium jewelry, accessories, and apparel.</p>
        </div>
        <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Shop</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Link href="/shop" style={{ color: 'inherit', textDecoration: 'none' }}>All Products</Link>
            <Link href="/categories" style={{ color: 'inherit', textDecoration: 'none' }}>Categories</Link>
          </div>
        </div>
        <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>Contact Us</span><span>Shipping Info</span><span>Returns</span><span>FAQ</span>
          </div>
        </div>
        <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Account</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Register</Link>
            <Link href="/account" style={{ color: 'inherit', textDecoration: 'none' }}>My Account</Link>
          </div>
        </div>
      </div>
      <div className="container" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
        &copy; 2026 Adorn. All rights reserved.
      </div>
    </footer>
  );
}
