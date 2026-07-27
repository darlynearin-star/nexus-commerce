'use client';

import './globals.css';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthGuard } from '@/lib/auth-guard';
import ErrorBoundary from '@/lib/error-boundary';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Settings, Image, Megaphone, LogOut, Menu, X, Store, CreditCard, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/products', label: 'Products', icon: <Package size={18} /> },
    { href: '/orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { href: '/customers', label: 'Customers', icon: <Users size={18} /> },
    { href: '/marketing', label: 'Marketing', icon: <Megaphone size={18} /> },
    { href: '/media', label: 'Products', icon: <Package size={18} /> },
    { href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { href: '/subscription', label: 'Subscription', icon: <CreditCard size={18} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  if (pathname === '/login') return <>{children}</>;

  return (
    <AuthGuard roles={['RETAILER', 'DEVELOPER', 'SUPER_DEVELOPER']}>
      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeMobile} />
      <div className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{ width: collapsed ? 64 : 'var(--sidebar)', transition: 'width 0.2s' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && <Link href="/dashboard" onClick={closeMobile} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}><Store size={22} /> Retailer</Link>}
          <button className="btn btn-ghost btn-icon" onClick={() => { if (window.innerWidth < 768) setMobileOpen(false); else setCollapsed(!collapsed); }}>{collapsed ? <Menu size={18} /> : <X size={18} />}</button>
        </div>
        <nav style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
        </div>
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.25rem' }}>
              Questions or errors? Email Mr.Dev<br />
              <a href="mailto:darlenzai01@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>darlenzai01@gmail.com</a>
            </div>
          )}
        </div>
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          {!collapsed && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8125rem' }}>{user.firstName[0]}</div>
              <div style={{ fontSize: '0.8125rem' }}><p style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</p><p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{user.role}</p></div>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--error)' }} onClick={logout}><LogOut size={16} /> {!collapsed && 'Sign Out'}</button>
        </div>
      </div>
      <div className="main-content" style={{ marginLeft: collapsed ? 64 : 'var(--sidebar)', transition: 'margin 0.2s' }}>
        <button className="btn btn-ghost btn-icon mobile-sidebar-btn" onClick={() => setMobileOpen(true)} style={{ position: 'fixed', top: '0.75rem', left: '0.75rem', zIndex: 50, background: 'var(--bg-card)' }}><Menu size={20} /></button>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </AuthGuard>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" /></head>
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