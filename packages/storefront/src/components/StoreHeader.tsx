'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { ShoppingCart, Heart, Search, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function StoreHeader() {
  const { store } = useStore();
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  if (!store) return null;

  const navLinks = [
    { href: `/store/${store.slug}`, label: 'Home', endsWith: false },
    { href: `/store/${store.slug}/shop`, label: 'Shop', endsWith: true },
  ];

  const isActive = (href: string, endsWith: boolean) =>
    endsWith ? (pathname === href || pathname.startsWith(href)) : pathname === href;

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: '1rem' }}>
        <Link href={`/store/${store.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          {store.logoUrl ? (
            <Image src={store.logoUrl} alt={store.name} width={180} height={40} style={{ height: 40, maxWidth: 180, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{store.name}</span>
          )}
        </Link>

        <nav style={{ display: 'flex', gap: '0.125rem', alignItems: 'center' }} className="store-desktop-nav">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '0.45rem 0.875rem',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: isActive(l.href, l.endsWith) ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive(l.href, l.endsWith) ? 'var(--glow)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
            }}>{l.label}</Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><Search size={19} /></button>
          <Link href="/wishlist" className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} aria-label="Wishlist"><Heart size={19} /></Link>
          <Link href="/cart" className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} aria-label="Cart"><ShoppingCart size={19} /></Link>
          {user ? (
            <Link href="/account" className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
              <User size={18} /> {user.firstName}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
              <User size={18} /> Sign In
            </Link>
          )}
          <button className="btn btn-ghost btn-icon store-mobile-menu-btn" style={{ borderRadius: 8 }} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {searchOpen && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <input className="input" placeholder="Search products..." autoFocus style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/store/${store.slug}/shop?search=${e.currentTarget.value}`; }} />
          </div>
        </div>
      )}
      {mobileMenu && (
        <div className="store-mobile-menu" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className="nav-item" onClick={() => setMobileMenu(false)} style={{ justifyContent: 'flex-start' }}>{l.label}</Link>
            ))}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) { .store-desktop-nav { display: none !important; } }
        @media (min-width: 769px) { .store-mobile-menu-btn, .store-mobile-menu { display: none !important; } }
      `}</style>
    </header>
  );
}