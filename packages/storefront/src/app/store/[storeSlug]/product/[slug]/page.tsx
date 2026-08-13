'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { storeApi } from '@/lib/store-api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, ChevronRight, Info } from 'lucide-react';
import StarRating from '@/components/StarRating';

export default function StoreProductPage() {
  const { slug, storeSlug } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const [saved, setSaved] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const { user } = useAuth();

  const toggleWishlist = async () => {
    if (!user) { router.push('/login'); return; }
    try {
      setSaved(s => s ? s : !s);
      await storeApi.post('/wishlist/add', { productId: product.id }).catch(() => {});
      setSaved(true);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    storeApi.get(`/products/${slug}`).then((r: any) => { setProduct(r.data); const imgs = r.data.images?.length > 0 ? r.data.images : [`https://picsum.photos/seed/${r.data.id}/600/600`]; setMainImg(imgs[0]); }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!product) return <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--error)' }}>Product not found</div>;

  const imgs = product.images?.length > 0 ? product.images : [`https://picsum.photos/seed/${product.id}/600/600`];

  return (
    <div className="container" style={{ padding: '2rem 0', position: 'relative', zIndex: 1 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href={`/store/${storeSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>Shop</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text)' }}>{product.name}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <img src={mainImg} alt={product.name} fetchPriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/600/600`; }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {imgs.map((url: string, i: number) => (
              <img key={i} src={url} alt="" onClick={() => setMainImg(url)} loading={i === 0 ? 'eager' : 'lazy'}
                style={{ width: 64, height: 64, borderRadius: '0.5rem', objectFit: 'cover', cursor: 'pointer', flexShrink: 0, border: mainImg === url ? '2px solid var(--primary)' : '2px solid transparent' }} onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}-${i}/600/600`; }} />
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{product.brand}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2.125rem)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '0.75rem' }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <StarRating rating={4.5} count={product.reviews?.length || 0} />
          </div>

          <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem' }}>
            UGX {product.price.toLocaleString()}
          </div>

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>{product.description}</p>

          {product.features?.length > 0 && (
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              {product.features.map((f: string, i: number) => <li key={i}>{f}</li>)}
            </ul>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
              <span style={{ minWidth: '2.5rem', textAlign: 'center', fontWeight: 500 }}>{quantity}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            {user ? (
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 160 }} onClick={async () => {
                try {
                  setCartError('');
                  await storeApi.post('/cart/add', { productId: product.id, quantity });
                  setAddedToCart(true);
                  setTimeout(() => setAddedToCart(false), 2000);
                } catch (e: any) { setCartError(e.message || 'Cart error'); }
              }}>
                {addedToCart ? '✓ Added!' : <><ShoppingCart size={16} /> Add to Cart</>}
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 160 }}>
                <ShoppingCart size={16} /> Sign In to Purchase
              </Link>
            )}
            <button className="btn btn-secondary btn-icon" onClick={toggleWishlist} aria-label="Save to wishlist"><Heart size={16} fill={saved ? 'currentColor' : 'none'} /></button>
          </div>
          {cartError && <p style={{ color: 'var(--error)', fontSize: '0.8125rem', marginTop: '-0.75rem' }}>{cartError}</p>}

          <div className="pay-note-prod" style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
            <Info size={14} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
            <span>Pay on delivery. Delivery fees are to be discussed and negotiated with the person in charge of the goods and services.</span>
          </div>

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
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
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>You May Also Like</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {product.related.map((p: any) => (
              <Link key={p.id} href={`/store/${storeSlug}/product/${p.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <img src={p.images?.[0] || `https://picsum.photos/seed/${p.id}/300/300`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.id}/300/300`; }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{p.brand}</p>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{p.name}</p>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>UGX {p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
