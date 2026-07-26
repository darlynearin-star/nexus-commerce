'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CreditCard, Lock, Smartphone } from 'lucide-react';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<any>({ items: [], subtotal: 0, shippingCost: 0, taxAmount: 0, total: 0 });
  const [method, setMethod] = useState('mtn_momo');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => { if (!user) router.push('/login'); else loadCart(); }, [user]);

  const loadCart = async () => {
    try {
      const r: any = await api.get('/cart');
      setCart(r.data || { items: [], subtotal: 0, shippingCost: 0, taxAmount: 0, total: 0 });
    } catch (e: any) { console.error('Failed to load cart:', e); }
  };

  const placeOrder = async () => {
    setSubmitting(true); setMessage('');
    try {
      const orderRes: any = await api.post('/orders');
      if (!orderRes.success) { setMessage(orderRes.error || 'Failed to create order'); setSubmitting(false); return; }
      const payRes: any = await api.post('/payments/charge', { orderId: orderRes.data.id, method, phone: phone || '256700000000' });
      if (payRes.success) {
        setMessage('Order placed! Payment request sent to your phone.');
        setTimeout(() => router.push('/account'), 2000);
      } else {
        setMessage('Order created but payment failed. Check your account.');
      }
    } catch (e: any) { setMessage(e?.message || 'Checkout failed'); } finally { setSubmitting(false); }
  };

  const methods = [
    { id: 'mtn_momo', label: 'MTN Mobile Money', icon: <Smartphone size={18} /> },
    { id: 'airtel_money', label: 'Airtel Money', icon: <Smartphone size={18} /> },
    { id: 'flutterwave', label: 'Card / Flutterwave', icon: <CreditCard size={18} /> },
  ];

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Checkout</h1>
      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.includes('failed') ? '#2e0505' : '#052e16', color: message.includes('failed') ? '#f87171' : '#4ade80' }}>
          {message}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Shipping Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>First Name</label><input className="input" value={user?.firstName || ''} disabled /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Last Name</label><input className="input" value={user?.lastName || ''} disabled /></div>
            </div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Email</label><input className="input" value={user?.email || ''} disabled /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Phone (for Mobile Money)</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="2567XXXXXXXX" /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Address</label><input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>City</label><input className="input" value="Kampala" /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Country</label><input className="input" value="Uganda" disabled /></div>
            </div>
          </div>

          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} /> Payment Method
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {methods.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `2px solid ${method === m.id ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                {m.icon}
                <span style={{ fontWeight: 500 }}>{m.label}</span>
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', width: '100%' }} disabled={submitting || cart.items.length === 0} onClick={placeOrder}>
            <Lock size={18} /> {submitting ? 'Processing...' : `Pay UGX ${(cart.total || 0).toLocaleString()}`}
          </button>
        </div>
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h3>
            {cart.items?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cart.items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>{item.product?.name} x{item.quantity}</span>
                    <span>UGX {(item.product?.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span><span>UGX {(cart.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>Shipping</span><span>{cart.shippingCost > 0 ? `UGX ${cart.shippingCost.toLocaleString()}` : 'Free'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 700, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                    <span>Total</span><span>UGX {(cart.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Your cart is empty</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
