'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      const headers: any = {};
      if (!user) headers['x-session-id'] = localStorage.getItem('sessionId') || 'guest';
      const res = await api.get('/cart');
      setCart(res.data);
    } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    await api.put(`/cart/item/${itemId}`, { quantity });
    loadCart();
  };

  const removeItem = async (itemId: string) => {
    await api.delete(`/cart/item/${itemId}`);
    loadCart();
  };

  if (loading) return <div className="container" style={{ padding: '3rem 0' }}><div className="skeleton" style={{ height: 200 }} /></div>;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Shopping Cart</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <ShoppingBag size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)', opacity: 0.5 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Looks like you haven&apos;t added anything yet.</p>
          <Link href="/shop" className="btn btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item: any) => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                <div style={{ width: 100, height: 100, borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                  <img src={`https://picsum.photos/seed/${item.product.id}/200/200`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Link href={`/product/${item.product.slug}`} style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'inherit', textDecoration: 'none' }}>{item.product.name}</Link>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{item.variantId ? `Variant: ${item.variantId}` : ''}</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>UGX {(item.product.price * item.quantity).toLocaleString()}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                      <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>{item.quantity}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="card" style={{ position: 'sticky', top: 80 }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Shipping</span><span>{subtotal >= 150000 ? 'Free' : 'UGX 15,000'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Tax (18% VAT)</span><span>UGX {Math.round(subtotal * 0.18).toLocaleString()}</span></div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 700 }}>
                  <span>Total</span><span>UGX {Math.round(subtotal + (subtotal >= 150000 ? 0 : 15000) + subtotal * 0.18).toLocaleString()}</span>
                </div>
              </div>
              {user ? (
                <Link href="/checkout" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '0.75rem' }}>Proceed to Checkout</Link>
              ) : (
                <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '0.75rem' }}>Sign In to Checkout</Link>
              )}
              <Link href="/shop" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}><ArrowLeft size={16} /> Continue Shopping</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}