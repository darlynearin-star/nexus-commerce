'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Heart, Search, User, Sun, Moon, Menu, X, Gem, Store, ExternalLink, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [isStorePage, setIsStorePage] = useState(false);

  useEffect(() => {
    setStoreSlug(localStorage.getItem('activeStoreSlug'));
    setIsStorePage(window.location.pathname.startsWith('/store/'));
  }, [user]);

  if (isStorePage) return null;

  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || '';
  const retDashUrl = process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';
  const devDashUrl = process.env.NEXT_PUBLIC_DEVELOPER_DASHBOARD_URL || 'https://nexus-commerce-developer-dashboard.vercel.app';

  return (
    <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: '1rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
          <Gem size={28} />
          <span className={isDark ? 'gold-shimmer' : ''}>Adorn</span>
        </Link>

        <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="desktop-nav">
          <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
          <Link href="/shop" className="btn btn-ghost btn-sm">Shop</Link>
          <Link href="/categories" className="btn btn-ghost btn-sm">Categories</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSearchOpen(!searchOpen)}><Search size={20} /></button>
          <Link href="/wishlist" className="btn btn-ghost btn-icon"><Heart size={20} /></Link>
          <Link href="/cart" className="btn btn-ghost btn-icon"><ShoppingCart size={20} /></Link>
          {user ? (
            <>
              {user.role === 'RETAILER' && (
                <>
                  {storeSlug ? (
                    <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
                      <Store size={16} /> Visit Store <ExternalLink size={12} />
                    </a>
                  ) : (
                    <Link href="/create-store" className="btn btn-ghost btn-sm" style={{ gap: '0.375rem', color: 'var(--primary)' }}>
                      <Store size={16} /> Create Store
                    </Link>
                  )}
                  <a href={retDashUrl + '/dashboard'} className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
                    <LayoutDashboard size={16} /> Dashboard
                  </a>
                </>
              )}
              {user.role === 'DEVELOPER' || user.role === 'SUPER_DEVELOPER' ? (
                <a href={devDashUrl + '/dashboard'} className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
                  <LayoutDashboard size={16} /> Dashboard
                </a>
              ) : null}
              <Link href="/account" className="btn btn-ghost btn-sm" style={{ gap: '0.375rem' }}>
                <User size={18} /> {user.firstName}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">Sign In</Link>
          )}
          <button className="btn btn-ghost btn-icon" onClick={toggleDark}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {searchOpen && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <input className="input" placeholder="Search products..." autoFocus style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              onKeyDown={async (e) => { if (e.key === 'Enter') window.location.href = `/shop?search=${e.currentTarget.value}`; }} />
          </div>
        </div>
      )}
      {mobileMenu && (
        <div className="mobile-menu" style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/" className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Home</Link>
            <Link href="/shop" className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Shop</Link>
            <Link href="/categories" className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Categories</Link>
            <Link href="/wishlist" className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Wishlist</Link>
            <Link href="/cart" className="btn btn-ghost" onClick={() => setMobileMenu(false)}>Cart</Link>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
        @media (min-width: 769px) { .mobile-menu-btn, .mobile-menu { display: none !important; } }
      `}</style>
    </header>
  );
}
