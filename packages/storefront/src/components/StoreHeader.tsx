'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';
import { ShoppingCart, Heart, Search, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function StoreHeader() {
  const { store } = useStore();
  const { user } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  if (!store) return null;

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: '1rem' }}>
        <Link href={`/store/${store.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          {store.logoUrl ? (
            <img src={store.logoUrl} alt={store.name} style={{ height: 40, maxWidth: 180, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{store.name}</span>
          )}
        </Link>

        <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="store-desktop-nav">
          <Link href={`/store/${store.slug}`} className="btn btn-ghost btn-sm">Home</Link>
          <Link href={`/store/${store.slug}/shop`} className="btn btn-ghost btn-sm">Shop</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSearchOpen(!searchOpen)}><Search size={20} /></button>
          <Link href={`/store/${store.slug}/shop`} className="btn btn-ghost btn-icon"><Heart size={20} /></Link>
          <Link href={`/store/${store.slug}/shop`} className="btn btn-ghost btn-icon"><ShoppingCart size={20} /></Link>
          {user && (
            <Link href={`/store/${store.slug}/shop`} className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
              <User size={18} /> {user.firstName}
            </Link>
          )}
          <button className="btn btn-ghost btn-icon store-mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href={`/store/${store.slug}`} className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Home</Link>
            <Link href={`/store/${store.slug}/shop`} className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Shop</Link>
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
