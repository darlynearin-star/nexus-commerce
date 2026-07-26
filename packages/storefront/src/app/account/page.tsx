'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User, Package, Heart, MapPin, Settings, LogOut, CreditCard, Ticket, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => { if (user) api.get('/orders').then((r: any) => setOrders(r.data)).catch((e: any) => console.error('API error:', e)); }, [user]);

  if (!user) return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}><h2>Please sign in to view your account</h2></div>;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <User size={18} /> },
    { id: 'orders', label: 'Orders', icon: <Package size={18} /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart size={18} /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="container" style={{ padding: '2rem 0', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem' }}>
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{user.firstName[0]}</div>
            <div><p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{user.firstName} {user.lastName}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</p></div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }} onClick={logout}><LogOut size={16} /> Sign Out</button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Total Orders</p><p style={{ fontSize: '2rem', fontWeight: 700 }}>{orders.length}</p></div>
            <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Wishlist</p><p style={{ fontSize: '2rem', fontWeight: 700 }}>0</p></div>
            <div className="card"><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Member Since</p><p style={{ fontSize: '1rem', fontWeight: 600 }}>{new Date().toLocaleDateString()}</p></div>
          </div>
        )}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Order History</h2>
            {orders.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><Package size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><p>No orders yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {orders.map((o: any) => (
                  <div key={o.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><p style={{ fontWeight: 600 }}>{o.orderNumber}</p><p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</p></div>
                    <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 700 }}>UGX {o.total.toLocaleString()}</p><span className={`badge badge-${o.status === 'COMPLETED' ? 'success' : o.status === 'PROCESSING' ? 'warning' : 'info'}`}>{o.status}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="card"><h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Account Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Name</label><p>{user.firstName} {user.lastName}</p></div>
              <div><label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</label><p>{user.email}</p></div>
              <div><label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Role</label><span className="badge badge-info">{user.role}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}