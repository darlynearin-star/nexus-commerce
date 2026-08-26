'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const [wishlists, setWishlists] = useState<any[]>([]);

  useEffect(() => { api.get('/wishlist').then((r: any) => setWishlists(r.data)).catch((e: any) => console.error('API error:', e)); }, []);

  const removeItem = async (itemId: string) => {
    await api.delete(`/wishlist/item/${itemId}`);
    setWishlists(prev => prev.map(w => ({ ...w, items: w.items.filter((i: any) => i.id !== itemId) })));
  };

  const items = wishlists.flatMap(w => w.items);

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <p className="eyebrow">Saved</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '2rem' }}>My Wishlist</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Heart size={64} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--primary)' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Your wishlist is empty</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Save items you love to your wishlist</p>
          <Link href="/store/adorn/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Products</Link>
        </div>
      ) : (
        <div className="product-grid">
          {items.map((item: any) => (
            <div key={item.id} className="card">
              <Link href={`/product/${item.product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem', position: 'relative' }}>
                  <Image src={item.product.images?.[0] || '/lynnyx-logo-long.png'} alt={item.product.name} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} loading="lazy" />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.product.brand}</p>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.product.name}</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>UGX {item.product.price.toLocaleString()}</p>
              </Link>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => api.post('/cart/add', { productId: item.productId })}>Add to Cart</button>
                <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => removeItem(item.id)} aria-label="Remove item"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
