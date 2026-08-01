'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function Footer() {
  const { isDark } = useTheme();
  const [isStorePage, setIsStorePage] = useState(false);

  useEffect(() => {
    setIsStorePage(window.location.pathname.startsWith('/store/'));
  }, []);

  if (isStorePage) return null;

  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: 'clamp(1.5rem, 4vw, 3rem) 0', marginTop: '3rem' }}>
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
              <Gem size={24} />
              <span className={isDark ? 'gold-shimmer' : ''}>Lyn-nxy Stores</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>Shop, sell, and scale. Premium products, smart commerce.</p>
          </div>
          <div><h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Shop</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <Link href="/store/adorn/shop" style={{ color: 'inherit', textDecoration: 'none' }}>Demo Shop</Link>
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
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
          &copy; 2026 Lyn-nxy Stores. All rights reserved.
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
