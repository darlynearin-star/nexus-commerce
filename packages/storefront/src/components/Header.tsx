'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Heart, Search, User, Sun, Moon, Menu, X, Gem, Store, ExternalLink, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [hasStore, setHasStore] = useState(false);
  const [isStorePage, setIsStorePage] = useState(false);

  useEffect(() => {
    setIsStorePage(window.location.pathname.startsWith('/store/'));
    if (user?.role === 'RETAILER') {
      api.get('/stores/mine').then((res: any) => {
        const s = res.data;
        setStoreSlug(s?.slug || null);
        setHasStore(!!s);
      }).catch(() => { setStoreSlug(null); setHasStore(false); });
    } else {
      setStoreSlug(null);
      setHasStore(false);
    }
  }, [user]);

  if (isStorePage) return null;

  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || '';
  const retDashUrl = process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';
  const devDashUrl = process.env.NEXT_PUBLIC_DEVELOPER_DASHBOARD_URL || 'https://nexus-commerce-developer-dashboard.vercel.app';

  const close = () => setMobileMenu(false);

  return (
    <>
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', flexShrink: 0 }}>
            <Gem size={28} />
            <span className={isDark ? 'gold-shimmer' : ''}>Lyn-nxy Stores</span>
          </Link>

          <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="desktop-nav">
            <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
            <Link href="/categories" className="btn btn-ghost btn-sm">Categories</Link>
            <Link href="/guides" className="btn btn-ghost btn-sm">Guides</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSearchOpen(!searchOpen)}><Search size={20} /></button>
            <Link href="/wishlist" className="btn btn-ghost btn-icon desktop-only"><Heart size={20} /></Link>
            <Link href="/cart" className="btn btn-ghost btn-icon desktop-only"><ShoppingCart size={20} /></Link>
            {user ? (
              <Link href="/account" className="btn btn-ghost btn-sm desktop-only" style={{ gap: '0.375rem' }}>
                <User size={18} /> <span className="user-name-header">{user.firstName}</span>
              </Link>
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
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenu && <div className="sidebar-overlay open" onClick={close} />}

      {/* Mobile sidebar */}
      <div className={`mobile-sidebar ${mobileMenu ? 'open' : ''}`}>
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" onClick={close} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
            <Gem size={24} />
            <span className={isDark ? 'gold-shimmer' : ''}>Lyn-nxy Stores</span>
          </Link>
          <button className="btn btn-ghost btn-icon" onClick={close}><X size={20} /></button>
        </div>

        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link href="/" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Home</Link>
          <Link href="/categories" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Categories</Link>
          <Link href="/guides" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Guides</Link>
          <Link href="/wishlist" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><Heart size={16} /> Wishlist</Link>
          <Link href="/cart" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><ShoppingCart size={16} /> Cart</Link>
        </div>

        {user && (
          <>
            <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account</div>
            <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/account" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><User size={16} /> {user.firstName} {user.lastName}</Link>
              {user.role === 'RETAILER' && hasStore && (
                <>
                  {storeSlug && (
                    <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={close}>
                      <Store size={16} /> Visit Store <ExternalLink size={12} />
                    </a>
                  )}
                  <a href={retDashUrl + '/dashboard#token=' + encodeURIComponent(localStorage.getItem('accessToken') || '')} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    <LayoutDashboard size={16} /> Dashboard
                  </a>
                </>
              )}
              {user.role === 'RETAILER' && !hasStore && (
                <Link href="/create-store" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--primary)' }}>
                  <Store size={16} /> Create Store
                </Link>
              )}
              {user.role === 'DEVELOPER' || user.role === 'SUPER_DEVELOPER' ? (
                <a href={devDashUrl + '/dashboard#token=' + encodeURIComponent(localStorage.getItem('accessToken') || '')} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                  <LayoutDashboard size={16} /> Dashboard
                </a>
              ) : null}
              <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--error)' }} onClick={() => { logout(); close(); }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </>
        )}

        {!user && (
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/login" onClick={close} className="btn btn-primary" style={{ justifyContent: 'center' }}>Sign In</Link>
            <Link href="/register" onClick={close} className="btn btn-ghost" style={{ justifyContent: 'center' }}>Create Account</Link>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) { .desktop-only { display: none !important; } .desktop-nav { display: none !important; } .mobile-menu-btn { display: inline-flex; } }
        @media (min-width: 769px) { .mobile-sidebar, .sidebar-overlay, .mobile-menu-btn { display: none !important; } }
        @media (max-width: 480px) { .user-name-header { display: none; } }
        .mobile-sidebar { position: fixed; top: 0; right: -280px; width: 280px; height: 100vh; background: var(--surface); border-left: 1px solid var(--border); z-index: 200; transition: right 0.25s ease; overflow-y: auto; }
        .mobile-sidebar.open { right: 0; }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; display: none; }
        .sidebar-overlay.open { display: block; }
      `}</style>
    </>
  );
}
