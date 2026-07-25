'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { storeApi } from '@/lib/store-api';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, ChevronRight } from 'lucide-react';
import StarRating from '@/components/StarRating';

export default function StoreProductPage() {
  const { slug, storeSlug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    storeApi.get(`/products/${slug}`).then((r: any) => setProduct(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!product) return <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--error)' }}>Product not found</div>;

  const img = `https://picsum.photos/seed/${product.id}/600/600`;

  return (
    <div className="container" style={{ padding: '2rem 0', position: 'relative', zIndex: 1 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        <Link href={`/store/${storeSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Shop</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text)' }}>{product.name}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <div>
          <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem' }}>
            <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{product.brand}</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <StarRating rating={4.5} count={product.reviews?.length || 0} />
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem' }}>
            UGX {product.price.toLocaleString()}
          </div>

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>{product.description}</p>

          {product.features?.length > 0 && (
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              {product.features.map((f: string, i: number) => <li key={i}>{f}</li>)}
            </ul>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
              <span style={{ minWidth: '2.5rem', textAlign: 'center', fontWeight: 500 }}>{quantity}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
              try {
                await storeApi.post('/cart/add', { productId: product.id, quantity });
                setAddedToCart(true);
                setTimeout(() => setAddedToCart(false), 2000);
              } catch {}
            }}>
              {addedToCart ? '✓ Added!' : <><ShoppingCart size={16} /> Add to Cart</>}
            </button>
            <button className="btn btn-secondary btn-icon"><Heart size={16} /></button>
          </div>

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} style={{ fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{k}: </span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {product.related?.length > 0 && (
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>You May Also Like</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {product.related.map((p: any) => (
              <Link key={p.id} href={`/store/${storeSlug}/product/${p.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <img src={`https://picsum.photos/seed/${p.id}/300/300`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{p.brand}</p>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{p.name}</p>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9375rem' }}>UGX {p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
