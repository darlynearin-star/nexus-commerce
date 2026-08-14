'use client';
import { useEffect, useState } from 'react';
import { storeApi } from '@/lib/store-api';
import { useAuth } from '@/lib/auth';
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const storeSlug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') || 'adorn' : 'adorn';

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      const res = await storeApi.get('/cart');
      setCart(res.data);
    } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    await storeApi.put(`/cart/item/${itemId}`, { quantity });
    loadCart();
  };

  const removeItem = async (itemId: string) => {
    await storeApi.delete(`/cart/item/${itemId}`);
    loadCart();
  };

  if (loading) return <div className="container" style={{ padding: '3rem 1rem' }}><div className="skeleton" style={{ height: 200 }} /></div>;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 3vw, 2rem) 1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>Shopping Cart</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <ShoppingBag size={64} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)', opacity: 0.5 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Looks like you haven&apos;t added anything yet.</p>
          <Link href={`/store/${storeSlug}/shop`} className="btn btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item: any) => (
              <div key={item.id} className="card cart-item">
                <div className="cart-item-img">
                  <img src={item.product.images?.[0] || `https://picsum.photos/seed/${item.product.id}/200/200`} alt={item.product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="cart-item-body">
                  <Link href={`/store/${storeSlug}/product/${item.product.slug}`} className="cart-item-name">{item.product.name}</Link>
                  <p className="cart-item-price">UGX {(item.product.price * item.quantity).toLocaleString()}</p>
                  <div className="cart-item-actions">
                    <div className="qty-controls">
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="card cart-summary">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
                <div className="summary-row"><span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
                <div className="summary-row total-row">
                  <span>Total</span><span>UGX {subtotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="pay-note-cart" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <Info size={14} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>Pay on delivery. Delivery fees to be discussed with the seller.</span>
              </div>
              {user ? (
                <Link href="/checkout" className="btn btn-primary cart-cta">Proceed to Checkout</Link>
              ) : (
                <Link href="/login" className="btn btn-primary cart-cta">Sign In to Checkout</Link>
              )}
              <Link href={`/store/${storeSlug}/shop`} className="btn btn-ghost cart-cta" style={{ marginTop: '0.5rem' }}><ArrowLeft size={16} /> Continue Shopping</Link>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .cart-layout { display: grid; gap: 1.5rem; }
        .cart-items { display: flex; flex-direction: column; gap: 1rem; }
        .cart-item { display: flex; gap: 0.75rem; padding: 1rem; }
        .cart-item-img { width: 80px; height: 80px; min-width: 80px; border-radius: 0.5rem; overflow: hidden; background: var(--bg-secondary); }
        .cart-item-body { flex: 1; min-width: 0; }
        .cart-item-name { font-weight: 600; font-size: 0.9375rem; color: inherit; text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cart-item-price { font-size: 1rem; font-weight: 700; color: var(--primary); margin-top: 0.25rem; }
        .cart-item-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
        .qty-controls { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 0.375rem; }
        .qty-value { padding: 0.25rem 0.75rem; font-size: 0.875rem; }
        .cart-summary { position: sticky; top: 80px; }
        .summary-row { display: flex; justify-content: space-between; }
        .total-row { border-top: 1px solid var(--border); padding-top: 0.75rem; font-size: 1.125rem; font-weight: 700; }
        .cart-cta { width: 100%; justify-content: center; margin-top: 1.5rem; padding: 0.75rem; }
        @media (min-width: 769px) {
          .cart-layout { grid-template-columns: 1fr 380px; gap: 2rem; }
        }
        @media (max-width: 768px) {
          .cart-layout { grid-template-columns: 1fr; }
          .cart-item-img { width: 64px; height: 64px; min-width: 64px; }
          .cart-item-name { font-size: 0.875rem; }
          .cart-item-price { font-size: 0.875rem; }
          .cart-summary { position: static; }
        }
        @media (max-width: 380px) {
          .cart-item-img { width: 52px; height: 52px; min-width: 52px; }
          .cart-item-actions { flex-wrap: wrap; gap: 0.5rem; }
        }
      `}</style>
    </div>
  );
}
