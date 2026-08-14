'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { useTheme } from '@/lib/theme';

export default function Footer() {
  const { isDark } = useTheme();
  const [isStorePage, setIsStorePage] = useState(false);

  useEffect(() => {
    setIsStorePage(window.location.pathname.startsWith('/store/'));
  }, []);

  if (isStorePage) return null;

  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: 'clamp(2rem, 5vw, 3.5rem) 0', marginTop: '3rem' }}>
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--primary)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>N</span>
              <span className={isDark ? '' : ''}>Lyn-nyx Stores</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 260 }}>Shop, sell, and scale. Premium products, smart commerce, powered by local makers.</p>
          </div>
          <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Shop</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <Link href="/store/adorn/shop" style={{ color: 'inherit', textDecoration: 'none' }}>Demo Shop</Link>
              <Link href="/categories" style={{ color: 'inherit', textDecoration: 'none' }}>Categories</Link>
            </div>
          </div>
          <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <a href="mailto:darlenzai01@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>Contact Us</a><Link href="/guides" style={{ color: 'inherit', textDecoration: 'none' }}>Guides &amp; Tutorials</Link><Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            </div>
          </div>
          <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Account</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
              <Link href="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Register</Link>
              <Link href="/account" style={{ color: 'inherit', textDecoration: 'none' }}>My Account</Link>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
          &copy; 2026 Lyn-nyx Stores. All rights reserved.
        </div>
      </div>
      <style>{`
        .footer-grid { display: grid; gap: 2rem; }
        @media (min-width: 601px) { .footer-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }
        @media (max-width: 600px) { .footer-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 380px) { .footer-grid { grid-template-columns: 1fr; } }
      `}</style>
    </footer>
  );
}