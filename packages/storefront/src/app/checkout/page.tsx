'use client';
import { useEffect, useState } from 'react';
import { storeApi } from '@/lib/store-api';
import { useAuth } from '@/lib/auth';
import { CheckCircle, Phone, MapPin, FileText, Info } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<any>({ items: [], subtotal: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [cartLoading, setCartLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
    }
    loadCart();
  }, [user, authLoading]);

  const loadCart = async () => {
    setCartLoading(true);
    try {
      const r: any = await storeApi.get('/cart');
      setCart(r.data || { items: [], subtotal: 0, total: 0 });
    } catch (e: any) { console.error('Failed to load cart:', e); }
    finally { setCartLoading(false); }
  };

  const placeOrder = async () => {
    setSubmitting(true); setMessage(null);
    const guestEmail = email.trim();
    if (!guestEmail) {
      setMessage({ text: 'Email is required for checkout', type: 'error' });
      setSubmitting(false);
      return;
    }
    try {
      const res: any = await storeApi.post('/orders', {
        guestEmail,
        guestName: `${firstName} ${lastName}`.trim() || 'Guest',
        customerPhone: phone, shippingAddress: address, notes,
      });
      if (!res.success) { setMessage({ text: res.error || 'Failed to create order', type: 'error' }); setSubmitting(false); return; }
      setOrder(res.data);
    } catch (e: any) { setMessage({ text: e?.message || 'Checkout failed', type: 'error' }); } finally { setSubmitting(false); }
  };

  if (order) {
    const total = order.total || 0;
    const storeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') || 'shop' : 'shop';
    return (
      <div className="container" style={{ padding: 'clamp(1rem, 3vw, 2rem) 1rem', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>Order Placed!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your order has been placed. Pay on delivery after confirming with the seller.</p>
        </div>

        <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1rem' }}>
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

        <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1rem' }}>
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

        <Link href={`/store/${storeSlug}/shop`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 3vw, 2rem) 1rem', maxWidth: 800 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>Checkout</h1>
      {!user && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Checking out as a guest. Have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link> to use saved details.
        </p>
      )}
      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: message.type === 'error' ? 'var(--bg-secondary)' : 'var(--bg-secondary)', color: message.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
          {message.text}
        </div>
      )}
      {authLoading || cartLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: 24, width: '30%' }} />
          <div className="skeleton" style={{ height: 240 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      ) : (
        <div className="checkout-grid">
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1rem' }}>Delivery Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="checkout-name-fields">
                <div><label htmlFor="checkoutFirstName" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>First Name</label><input id="checkoutFirstName" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div><label htmlFor="checkoutLastName" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Last Name</label><input id="checkoutLastName" className="input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div><label htmlFor="checkoutEmail" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Email</label><input id="checkoutEmail" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><label htmlFor="checkoutPhone" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Phone Number</label><input id="checkoutPhone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="2567XXXXXXXX" required /></div>
              <div><label htmlFor="checkoutAddress" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Delivery Address</label><input id="checkoutAddress" className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, area, landmark" /></div>
              <div><label htmlFor="checkoutNotes" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Delivery Notes (optional)</label><textarea id="checkoutNotes" className="input" style={{ minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Call when arriving, leave with guard..." /></div>
            </div>

            <div className="pay-note-checkout" style={{ marginTop: '1.5rem' }}>
              <Info size={16} />
              <div>
                <strong>Pay on Delivery</strong>
                <p>No online payment needed. Delivery fees are to be discussed and negotiated directly with the seller.</p>
              </div>
            </div>

            <button className="btn btn-primary checkout-btn" disabled={submitting || cart.items.length === 0 || !phone || !email.trim()} onClick={placeOrder}>
              {submitting ? 'Placing Order...' : `Place Order: Pay UGX ${(cart.total || 0).toLocaleString()} on Delivery`}
            </button>
          </div>
          <div>
            <div className="card checkout-summary">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h3>
              {cart.items?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
                  {cart.items.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>{item.product?.name} x{item.quantity}</span>
                      <span>UGX {(item.product?.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>UGX {(cart.subtotal || 0).toLocaleString()}</span>
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
      )}
      <style>{`
        .checkout-grid { display: grid; gap: 1.5rem; }
        .checkout-summary { position: sticky; top: 80px; }
        .pay-note-checkout { display: flex; gap: 0.75rem; align-items: flex-start; padding: 1rem; border-radius: 0.5rem; background: var(--bg-secondary); font-size: 0.875rem; }
        .checkout-btn { justify-content: center; padding: 0.875rem; font-size: 1rem; width: 100%; margin-top: 1rem; }
        .checkout-name-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (min-width: 769px) {
          .checkout-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
        }
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr; }
          .checkout-summary { position: static; }
          .checkout-name-fields { grid-template-columns: 1fr; }
        }
        @media (max-width: 380px) {
          .checkout-btn { font-size: 0.875rem; padding: 0.75rem; }
        }
      `}</style>
    </div>
  );
}
