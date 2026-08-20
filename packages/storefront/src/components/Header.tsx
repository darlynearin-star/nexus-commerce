'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Heart, Search, User, Sun, Moon, Menu, X, Store, ExternalLink, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import { useDismiss } from '@/lib/use-dismiss';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [hasStore, setHasStore] = useState(false);
  const [isStorePage, setIsStorePage] = useState(false);
  const [allStores, setAllStores] = useState<{ slug: string; name: string }[]>([]);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const mobileMenuRef = useDismiss(mobileMenu, () => setMobileMenu(false));
  const storeMenuRef = useDismiss(storeMenuOpen, () => setStoreMenuOpen(false));

  useEffect(() => {
    setIsStorePage(window.location.pathname.startsWith('/store/'));
    setActiveSlug(localStorage.getItem('activeStoreSlug'));
    api.get('/stores/public').then((res: any) => setAllStores(res.data || [])).catch(() => {});
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

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/categories', label: 'Categories' },
    { href: '/guides', label: 'Guides' },
  ];

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: '1.25rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', flexShrink: 0, letterSpacing: '-0.01em' }}>
            <Image src="/lynnyx-logo-long.png" alt="Lyn-nyx Stores" width={84} height={36} priority sizes="96px" style={{ height: 38, width: 'auto', objectFit: 'contain', display: 'block' }} />
          </Link>

          {allStores.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ borderRadius: 8, gap: '0.375rem' }}
                onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                aria-label="Switch store"
              >
                <Store size={16} />
                <span>{activeSlug ? allStores.find(s => s.slug === activeSlug)?.name || activeSlug : 'All Stores'}</span>
                <ChevronDown size={14} />
              </button>
              {storeMenuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 140 }} onClick={() => setStoreMenuOpen(false)} />
                  <div className="card" ref={storeMenuRef} tabIndex={-1} style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, zIndex: 150, minWidth: 220, padding: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
                    <button
                      className="nav-item"
                      style={{ width: '100%', justifyContent: 'flex-start', fontWeight: activeSlug === null ? 700 : 500 }}
                      onClick={() => { setActiveSlug(null); localStorage.removeItem('activeStoreSlug'); setStoreMenuOpen(false); window.location.href = '/shop'; }}
                    >
                      All Stores
                    </button>
                    {allStores.map(s => (
                      <button
                        key={s.slug}
                        className="nav-item"
                        style={{ width: '100%', justifyContent: 'flex-start', fontWeight: activeSlug === s.slug ? 700 : 500 }}
                        onClick={() => { setActiveSlug(s.slug); localStorage.setItem('activeStoreSlug', s.slug); setStoreMenuOpen(false); window.location.href = `/store/${s.slug}`; }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <nav style={{ display: 'flex', gap: '0.125rem', alignItems: 'center' }} className="desktop-nav">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: '0.45rem 0.875rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive(l.href) ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive(l.href) ? 'var(--glow)' : 'transparent',
                textDecoration: 'none',
                transition: 'color 0.15s, background 0.15s',
              }}>{l.label}</Link>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', minWidth: 0 }}>
            <button className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><Search size={19} /></button>
            <Link href="/wishlist" className="btn btn-ghost btn-icon desktop-only" style={{ borderRadius: 8 }} aria-label="Wishlist"><Heart size={19} /></Link>
            <Link href="/cart" className="btn btn-ghost btn-icon desktop-only" style={{ borderRadius: 8 }} aria-label="Cart"><ShoppingCart size={19} /></Link>
            {user ? (
              <Link href="/account" className="btn btn-ghost btn-sm desktop-only" style={{ gap: '0.375rem' }}>
                <User size={18} /> <span className="user-name-header">{user.firstName}</span>
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm desktop-only">Sign In</Link>
            )}
            <button className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} onClick={toggleDark} aria-label="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-ghost btn-icon mobile-menu-btn" style={{ borderRadius: 8 }} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
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
      <div className={`mobile-sidebar ${mobileMenu ? 'open' : ''}`} ref={mobileMenuRef} tabIndex={-1}>
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" onClick={close} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
            <Image src="/lynnyx-logo-long.png" alt="Lyn-nyx Stores" width={70} height={30} sizes="80px" style={{ height: 30, width: 'auto', objectFit: 'contain', display: 'block' }} />
          </Link>
          <button className="btn btn-ghost btn-icon" style={{ borderRadius: 8 }} onClick={close} aria-label="Close"><X size={20} /></button>
        </div>

        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={close} className="nav-item" style={{ justifyContent: 'flex-start' }}>{l.label}</Link>
          ))}
          <Link href="/wishlist" onClick={close} className="nav-item" style={{ justifyContent: 'flex-start' }}><Heart size={16} /> Wishlist</Link>
          <Link href="/cart" onClick={close} className="nav-item" style={{ justifyContent: 'flex-start' }}><ShoppingCart size={16} /> Cart</Link>
        </div>

        {user && (
          <>
            <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.71875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Account</div>
            <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/account" onClick={close} className="nav-item" style={{ justifyContent: 'flex-start' }}><User size={16} /> {user.firstName} {user.lastName}</Link>
              {user.role === 'RETAILER' && hasStore && (
                <>
                  {storeSlug && (
                    <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="nav-item" style={{ justifyContent: 'flex-start' }} onClick={close}>
                      <Store size={16} /> Visit Store <ExternalLink size={12} />
                    </a>
                  )}
                  <a href={retDashUrl + '/dashboard#token=' + encodeURIComponent(localStorage.getItem('accessToken') || '')} className="nav-item" style={{ justifyContent: 'flex-start' }}>
                    <LayoutDashboard size={16} /> Dashboard
                  </a>
                </>
              )}
              {user.role === 'RETAILER' && !hasStore && (
                <Link href="/create-store" onClick={close} className="nav-item" style={{ justifyContent: 'flex-start', color: 'var(--primary)' }}>
                  <Store size={16} /> Create Store
                </Link>
              )}
              {user.role === 'DEVELOPER' || user.role === 'SUPER_DEVELOPER' ? (
                <a href={devDashUrl + '/dashboard#token=' + encodeURIComponent(localStorage.getItem('accessToken') || '')} className="nav-item" style={{ justifyContent: 'flex-start' }}>
                  <LayoutDashboard size={16} /> Dashboard
                </a>
              ) : null}
              <button className="nav-item" style={{ justifyContent: 'flex-start', color: 'var(--error)' }} onClick={() => { logout(); close(); }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </>
        )}

        {!user && (
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/login" onClick={close} className="btn btn-primary" style={{ justifyContent: 'center' }}>Sign In</Link>
            <Link href="/register" onClick={close} className="btn btn-secondary" style={{ justifyContent: 'center' }}>Create Account</Link>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) { .desktop-only { display: none !important; } .desktop-nav { display: none !important; } .mobile-menu-btn { display: inline-flex; } }
        @media (min-width: 769px) { .mobile-sidebar, .sidebar-overlay, .mobile-menu-btn { display: none !important; } }
        @media (max-width: 480px) { .user-name-header { display: none; } }
        .mobile-sidebar { position: fixed; top: 0; right: -280px; width: 280px; height: 100vh; background: var(--surface); border-left: 1px solid var(--border); z-index: 200; transition: right 0.25s ease; overflow-y: auto; }
        .mobile-sidebar.open { right: 0; }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 199; display: none; }
        .sidebar-overlay.open { display: block; }
      `}</style>
    </>
  );
}