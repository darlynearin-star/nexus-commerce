'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User, Package, ShoppingCart, Mail, Settings, LogOut, Store, Activity, AlertTriangle, Bell, CheckCheck, ExternalLink, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState({ orders: true, cart: true, notifications: true });
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isStoreOwner = !!(user as any)?.retailer;
  const retailer = (user as any)?.retailer;
  const storeSlug = retailer?.storeSlug;
  const subscription = retailer?.subscription;
  const tierName = subscription?.status === 'TRIAL' ? 'Trial' : subscription?.status === 'ACTIVE' ? 'Weekly' : subscription?.status || 'N/A';
  const tierProgress = subscription?.trialEnd ? Math.min(100, Math.round((Date.now() - new Date(subscription.trialStart).getTime()) / (new Date(subscription.trialEnd).getTime() - new Date(subscription.trialStart).getTime()) * 100)) : 0;

  useEffect(() => {
    if (!user) return;
    api.get<any>('/orders').then(r => { setOrders(r.data || []); setLoading(p => ({ ...p, orders: false })); }).catch(() => setLoading(p => ({ ...p, orders: false })));
    if (!isStoreOwner) {
      api.get<any>('/cart').then(r => { setCart(r.data); setLoading(p => ({ ...p, cart: false })); }).catch(() => setLoading(p => ({ ...p, cart: false })));
    }
    api.get<any>('/notifications').then(r => { setNotifications(r.data?.notifications || []); setUnreadCount(r.data?.unreadCount || 0); setLoading(p => ({ ...p, notifications: false })); }).catch(() => setLoading(p => ({ ...p, notifications: false })));
  }, [user]);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((n: any) => n.map((x: any) => ({ ...x, isRead: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((n: any) => n.map((x: any) => x.id === id ? { ...x, isRead: true } : x));
    setUnreadCount((c: number) => Math.max(0, c - 1));
  };

  if (!user) return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}><h2>Please sign in to view your account</h2><Link href="/login" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Sign In</Link></div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'orders', label: 'Orders', icon: <Package size={18} />, badge: orders.length || undefined },
    { id: 'cart', label: 'Cart', icon: <ShoppingCart size={18} />, badge: !isStoreOwner ? cart?.items?.length || 0 : undefined },
    ...(isStoreOwner ? [{ id: 'mailbox', label: 'Mailbox', icon: <Mail size={18} />, badge: unreadCount || undefined }] : []),
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const renderContent = () => (
    <>
      {activeTab === 'overview' && <OverviewTab user={user} orders={orders} isStoreOwner={isStoreOwner} retailer={retailer} subscription={subscription} tierName={tierName} tierProgress={tierProgress} />}
      {activeTab === 'orders' && <OrdersTab orders={orders} loading={loading.orders} />}
      {activeTab === 'cart' && !isStoreOwner && <CartTab cart={cart} loading={loading.cart} />}
      {activeTab === 'cart' && isStoreOwner && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Use your <a href={`${process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app'}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`}>retailer dashboard</a> to manage your store.</p>}
      {activeTab === 'mailbox' && isStoreOwner && <MailboxTab notifications={notifications} unreadCount={unreadCount} markAllRead={markAllRead} markRead={markRead} loading={loading.notifications} />}
      {activeTab === 'settings' && <SettingsTab user={user} />}
    </>
  );

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 3vw, 2rem) 0.75rem' }}>
      {mobile ? (
        <>
          <div className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>{user.firstName?.[0]}{user.lastName?.[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.firstName} {user.lastName}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)', flexShrink: 0 }} onClick={logout}><LogOut size={16} /></button>
          </div>
          <nav style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map(tab => (
              <button key={tab.id} className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.8125rem' }} onClick={() => setActiveTab(tab.id)}>
                {tab.icon} {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '0 0.375rem', marginLeft: '0.25rem' }}>{tab.badge}</span>}
              </button>
            ))}
          </nav>
          {renderContent()}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem' }}>
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>{user.firstName?.[0]}{user.lastName?.[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.firstName} {user.lastName}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                </div>
              </div>
              {isStoreOwner && (
                <div style={{ marginBottom: '0.75rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    <Store size={14} /> {retailer.storeName}
                  </div>
                  {storeSlug && (
                    <Link href={`/store/${storeSlug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem' }}>
                      <ExternalLink size={12} /> View Store
                    </Link>
                  )}
                </div>
              )}
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }} onClick={logout}><LogOut size={16} /> Sign Out</button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {tabs.map(tab => (
                <button key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{tab.icon} {tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && <span className="badge badge-primary" style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem' }}>{tab.badge}</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="account-content">{renderContent()}</div>
        </div>
      )}
      <style>{`
        .account-content { min-width: 0; }
        @media (max-width: 768px) {
          .account-content { padding: 0; }
        }
      `}</style>
    </div>
  );
}

function OverviewTab({ user, orders, isStoreOwner, retailer, subscription, tierName, tierProgress }: any) {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome back, {user.firstName}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Here&apos;s your account overview</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Total Orders</p><p style={{ fontSize: '2rem', fontWeight: 700 }}>{orders.length}</p></div>
        <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Role</p><p style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{(user.role || '').toLowerCase().replace('_', ' ')}</p></div>
        <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Member Since</p><p style={{ fontSize: '1rem', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p></div>
      </div>

      {isStoreOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Store size={16} /> Store Status</h3>
              <span className={`badge badge-${retailer?.storeActive !== false ? 'success' : 'warning'}`}>{retailer?.storeActive !== false ? 'Active' : 'Paused'}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{retailer?.storeName || 'Your store'}</p>
            <a href={`${process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app'}/dashboard#token=${encodeURIComponent(localStorage.getItem('accessToken') || '')}`}
              target="_blank" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <ExternalLink size={14} /> Open Dashboard
            </a>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16} /> Subscription</h3>
              <span className={`badge badge-${subscription?.status === 'ACTIVE' ? 'success' : subscription?.status === 'TRIAL' ? 'info' : 'warning'}`}>{subscription?.status || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Plan: {tierName}</span>
              {subscription?.weeklyAmount && <span style={{ fontWeight: 600 }}>{subscription.currency || 'UGX'} {subscription.weeklyAmount.toLocaleString()}/wk</span>}
            </div>
            {subscription?.trialEnd && (
              <div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden', marginBottom: '0.25rem' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, tierProgress)}%`, borderRadius: 3, background: tierProgress > 80 ? 'var(--error)' : 'var(--primary)', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tierProgress}% of trial period</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders, loading }: any) {
  return (
    <div className="orders-tab">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Order History</h2>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ marginBottom: '0.25rem' }}>No orders yet</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>When you place an order, it will appear here.</p>
          <Link href="/" className="btn btn-primary btn-sm">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {orders.map((o: any) => (
            <div key={o.id} className="card order-card">
              <div className="order-card-left">
                <p style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{o.orderNumber}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                {o.items?.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{o.items.map((i: any) => i.productName).join(', ')}</p>}
              </div>
              <div className="order-card-right">
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>UGX {o.total?.toLocaleString()}</p>
                <span className={`badge badge-${o.status === 'COMPLETED' ? 'success' : o.status === 'PROCESSING' ? 'warning' : o.status === 'CANCELLED' ? 'error' : 'info'}`} style={{ fontSize: '0.6875rem' }}>{o.status || 'PENDING'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .order-card { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; }
        .order-card-left { min-width: 0; flex: 1; }
        .order-card-right { text-align: right; flex-shrink: 0; margin-left: 0.75rem; }
        @media (max-width: 480px) {
          .order-card { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
          .order-card-right { text-align: left; margin-left: 0; }
        }
      `}</style>
    </div>
  );
}

function CartTab({ cart, loading }: any) {
  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading cart...</p>;
  if (!cart || !cart.items?.length) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
      <p style={{ marginBottom: '0.25rem' }}>Your cart is empty</p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Browse stores and add items to get started.</p>
      <Link href="/" className="btn btn-primary btn-sm">Browse Stores</Link>
    </div>
  );
  return (
    <div className="account-cart">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Shopping Cart</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {cart.items.map((item: any) => (
          <div key={item.id} className="card account-cart-item">
            <div className="account-cart-img">
              {item.product?.images?.[0] ? <img src={item.product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={24} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/product/${item.product?.slug}`} style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.product?.name || 'Product'}</Link>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>UGX {item.product?.price?.toLocaleString()} each</p>
            </div>
            <div style={{ textAlign: 'center', minWidth: 40 }}><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>x{item.quantity}</span></div>
            <p style={{ fontWeight: 700, textAlign: 'right', minWidth: 80, flexShrink: 0 }}>UGX {(item.product?.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
        <p style={{ fontWeight: 600 }}>Total: <span style={{ fontSize: '1.25rem' }}>UGX {cart.subtotal?.toLocaleString() || '0'}</span></p>
        <Link href="/checkout" className="btn btn-primary">Proceed to Checkout</Link>
      </div>
      <style>{`
        .account-cart-item { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; }
        .account-cart-img { width: 60px; height: 60px; min-width: 60px; border-radius: 0.5rem; background: var(--bg-secondary); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; }
        @media (max-width: 480px) {
          .account-cart-item { flex-wrap: wrap; gap: 0.5rem; }
          .account-cart-img { width: 48px; height: 48px; min-width: 48px; }
          .account-cart-item > p:last-child { min-width: auto; }
        }
        @media (max-width: 769px) {
          .account-cart-item > p:last-child { min-width: 60px; font-size: 0.8125rem; }
        }
      `}</style>
    </div>
  );
}

function MailboxTab({ notifications, unreadCount, markAllRead, markRead, loading }: any) {
  const typeIcons: any = { NEW_ORDER_ALERT: <ShoppingBag size={16} />, TIER_WARNING: <AlertTriangle size={16} />, ADMIN_ANNOUNCEMENT: <Bell size={16} />, ORDER_CONFIRMATION: <Package size={16} />, LOW_STOCK: <AlertTriangle size={16} /> };
  const typeColors: any = { NEW_ORDER_ALERT: 'var(--primary)', TIER_WARNING: 'var(--warning)', ADMIN_ANNOUNCEMENT: 'var(--info)', ORDER_CONFIRMATION: 'var(--success)', LOW_STOCK: 'var(--error)' };

  return (
    <div className="mailbox-tab">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={20} /> Mailbox
          {unreadCount > 0 && <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{unreadCount} unread</span>}
        </h2>
        {unreadCount > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCheck size={14} /> Mark All Read</button>}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading messages...</p>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Mail size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>No messages yet</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>New order alerts, tier updates, and announcements will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map((n: any) => (
            <div key={n.id} className="card notification-card"
              onClick={() => !n.isRead && markRead(n.id)}
              style={{ padding: '0.875rem 1rem', cursor: !n.isRead ? 'pointer' : 'default', borderLeft: `3px solid ${!n.isRead ? (typeColors[n.type] || 'var(--primary)') : 'transparent'}`, opacity: n.isRead ? 0.7 : 1 }}>
              <div className="notification-inner">
                <div className="notification-icon">
                  {typeIcons[n.type] || <Bell size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notification-header">
                    <p style={{ fontWeight: !n.isRead ? 600 : 400, fontSize: '0.875rem' }}>{n.title}</p>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .notification-inner { display: flex; gap: 0.75rem; align-items: flex-start; }
        .notification-icon { width: 32px; height: 32px; min-width: 32px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .notification-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.125rem; gap: 0.5rem; }
        @media (max-width: 480px) {
          .notification-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}

function SettingsTab({ user }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Account Settings</h2>
      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="settings-grid">
          <span style={{ color: 'var(--text-secondary)' }}>Name</span><span style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Email</span><span style={{ fontWeight: 500 }}>{user.email}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Role</span><span className="badge badge-info" style={{ justifySelf: 'start' }}>{(user.role || '').replace('_', ' ').toLowerCase()}</span>
        </div>
      </div>
      <style>{`
        .settings-grid { display: grid; grid-template-columns: 120px 1fr; gap: 0.5rem; font-size: 0.875rem; }
        @media (max-width: 480px) {
          .settings-grid { grid-template-columns: 1fr; gap: 0.25rem; }
        }
      `}</style>
    </div>
  );
}
