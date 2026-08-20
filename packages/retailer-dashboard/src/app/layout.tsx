'use client';

import './globals.css';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthGuard } from '@/lib/auth-guard';
import { SubscriptionGuard } from '@/lib/subscription-guard';
import ErrorBoundary from '@/lib/error-boundary';
import { useDismiss } from '@/lib/use-dismiss';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Settings, Image, Megaphone, LogOut, Menu, X, Store, CreditCard, Eye, ExternalLink, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const mobileRef = useDismiss(mobileOpen, closeMobile);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/products', label: 'Product View', icon: <Package size={18} /> },
    { href: '/orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { href: '/customers', label: 'Customers', icon: <Users size={18} /> },
    { href: '/marketing', label: 'Marketing', icon: <Megaphone size={18} /> },
    { href: '/products/new', label: 'Product Creation', icon: <Package size={18} /> },
    { href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { href: '/subscription', label: 'Subscription', icon: <CreditCard size={18} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
    { href: '/guides', label: 'Guides & Tutorials', icon: <BookOpen size={18} /> },
  ];

  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGuard roles={['RETAILER', 'DEVELOPER', 'SUPER_DEVELOPER']}>
      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeMobile} />
      <div className={`sidebar ${mobileOpen ? 'open' : ''}`} ref={mobileRef} tabIndex={-1} style={{ width: collapsed ? 64 : 'var(--sidebar)', transition: 'width 0.2s' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" onClick={closeMobile} style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', textDecoration: 'none' }}>
            {collapsed
              ? <img src="/lynnyx-logo-square.png" alt="Lyn-nyx" style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }} />
              : <img src="/lynnyx-logo.png" alt="Lyn-nyx Retailer" style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }} />}
          </Link>
          <button className="btn btn-ghost btn-icon" onClick={() => { if (window.innerWidth < 768) setMobileOpen(false); else setCollapsed(!collapsed); }} aria-label="Toggle sidebar">{collapsed ? <Menu size={18} /> : <X size={18} />}</button>
        </div>
        <nav aria-label="Main navigation" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={closeMobile} className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`} style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              {item.icon} {!collapsed && item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          <a href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app'}/store/${typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : ''}`} target="_blank" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: '0.375rem' }}>
            <Eye size={16} /> {!collapsed && <>View Store <ExternalLink size={12} /></>}
          </a>
          <a href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app'} target="_blank" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', gap: '0.375rem', marginTop: '0.25rem' }}>
            <Store size={16} /> {!collapsed && <>To Main Page <ExternalLink size={12} /></>}
          </a>
        </div>
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.25rem' }}>
              Questions or errors? Email Mr.Dev<br />
              <a href="mailto:lyn.nyx.store@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>lyn.nyx.store@gmail.com</a>
            </div>
          )}
        </div>
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          {!collapsed && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8125rem' }}>{(user.firstName || user.email)[0].toUpperCase()}</div>
              <div style={{ fontSize: '0.8125rem' }}><p style={{ fontWeight: 500 }}>{user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.email}</p><p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{user.role === 'SUPER_DEVELOPER' ? 'Developer' : user.role.charAt(0) + user.role.slice(1).toLowerCase()}</p></div>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--error)' }} onClick={logout}><LogOut size={16} /> {!collapsed && 'Sign Out'}</button>
        </div>
      </div>
      <div className="main-content" role="main" style={{ marginLeft: collapsed ? 64 : 'var(--sidebar)', transition: 'margin 0.2s' }}>
        <button className="btn btn-ghost btn-icon mobile-sidebar-btn" onClick={() => setMobileOpen(true)} style={{ position: 'fixed', top: '0.75rem', left: '0.75rem', zIndex: 50, background: 'var(--bg-card)' }} aria-label="Open menu"><Menu size={20} /></button>
        <SubscriptionGuard><ErrorBoundary>{children}</ErrorBoundary></SubscriptionGuard>
      </div>
    </AuthGuard>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="icon" href="/lynnyx-logo-square.png" /><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" /></head>
      <body>
        <AuthProvider>
          <div style={{ display: 'flex' }}>
            <Sidebar><ErrorBoundary>{children}</ErrorBoundary></Sidebar>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}