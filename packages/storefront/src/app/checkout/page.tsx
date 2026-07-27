'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { CheckCircle, Phone, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<any>({ items: [], subtotal: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => { if (!user) { router.push('/login'); return; } loadCart(); }, [user]);

  const loadCart = async () => {
    try {
      const r: any = await api.get('/cart');
      setCart(r.data || { items: [], subtotal: 0, total: 0 });
    } catch (e: any) { console.error('Failed to load cart:', e); }
  };

  const placeOrder = async () => {
    setSubmitting(true); setMessage('');
    try {
      const res: any = await api.post('/orders', { customerPhone: phone, shippingAddress: address, notes });
      if (!res.success) { setMessage(res.error || 'Failed to create order'); setSubmitting(false); return; }
      setOrder(res.data);
    } catch (e: any) { setMessage(e?.message || 'Checkout failed'); } finally { setSubmitting(false); }
  };

  if (order) {
    const total = order.total || 0;
    return (
      <div className="container" style={{ padding: '2rem 0', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Order Placed!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your order has been placed successfully. Pay on delivery.</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Order #{order.orderNumber}</h3>
          {order.items?.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span>{item.productName} x{item.quantity}</span>
              <span>UGX {item.totalPrice.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
            <span>Total Due on Delivery</span>
            <span style={{ color: 'var(--primary)' }}>UGX {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} /> Delivery Details
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{order.shippingAddress || 'No address provided'}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <Phone size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> {order.customerPhone || 'No phone provided'}
          </p>
          {order.notes && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> {order.notes}
            </p>
          )}
        </div>

        {(order.storePhone || order.storeWhatsapp) && (
          <div style={{ padding: '1rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            <strong style={{ color: 'var(--text)' }}>Store Contact</strong>
            {order.storePhone && <p style={{ marginTop: '0.25rem' }}><Phone size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> {order.storePhone}</p>}
            {order.storeWhatsapp && <p style={{ marginTop: '0.25rem' }}>WhatsApp: {order.storeWhatsapp}</p>}
          </div>
        )}

        <Link href="/shop" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Continue Shopping</Link>
      </div>
    );
  }

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
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Delivery Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>First Name</label><input className="input" value={user?.firstName || ''} disabled /></div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Last Name</label><input className="input" value={user?.lastName || ''} disabled /></div>
            </div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Email</label><input className="input" value={user?.email || ''} disabled /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Phone Number</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="2567XXXXXXXX" required /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Delivery Address</label><input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, area, landmark" /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Delivery Notes (optional)</label><textarea className="input" style={{ minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Call when arriving, leave with guard..." /></div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', margin: '1.5rem 0', fontSize: '0.875rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Pay on Delivery</p>
            <p style={{ color: 'var(--text-secondary)' }}>No online payment needed. Pay UGX {(cart.total || 0).toLocaleString()} in cash when your order arrives.</p>
          </div>

          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', width: '100%' }} disabled={submitting || cart.items.length === 0 || !phone} onClick={placeOrder}>
            {submitting ? 'Placing Order...' : `Place Order — Pay UGX ${(cart.total || 0).toLocaleString()} on Delivery`}
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
