'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CreditCard, Lock, Gem } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', line1: '', city: '', state: '', postalCode: '', country: 'US' });

  useEffect(() => { if (!user) router.push('/login'); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/orders'); router.push('/account'); } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Checkout</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Shipping Information</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>First Name</label><input className="input" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Last Name</label><input className="input" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Address</label><input className="input" required value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>City</label><input className="input" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>State</label><input className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>ZIP</label><input className="input" required value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={18} /> Payment</h3>
              <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Demo payment - no real charges. Click Place Order to continue.</p>
              </div>
            </div>
            <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }} disabled={loading}>
              <Lock size={18} /> {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              Your cart items will appear here during checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
