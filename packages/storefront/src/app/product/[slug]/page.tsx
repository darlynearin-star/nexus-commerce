'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { Star, ShoppingCart, Heart, Share2, Check, Truck, Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [mainImg, setMainImg] = useState('');

  useEffect(() => {
    api.get(`/products/${slug}`).then((res: any) => {
      setProduct(res.data);
      const imgs = res.data.images?.length > 0 ? res.data.images : [`https://picsum.photos/seed/${res.data.id}/600/600`];
      setMainImg(imgs[0]);
      if (res.data.variants?.length) setSelectedVariant(res.data.variants[0]);
    }).finally(() => setLoading(false));
  }, [slug]);

  const addToCart = async () => {
    await api.post('/cart/add', { productId: product.id, variantId: selectedVariant?.id, quantity });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) return <div className="container" style={{ padding: '3rem 0' }}>
    <div className="skeleton" style={{ height: 400, marginBottom: '1rem' }} />
    <div className="skeleton" style={{ height: 30, width: '50%', marginBottom: '0.5rem' }} />
    <div className="skeleton" style={{ height: 30, width: '30%' }} />
  </div>;

  if (!product) return <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}><h2>Product not found</h2></div>;

  const price = selectedVariant?.price || product.price;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-secondary)' }}>{product.category?.name || 'Products'}</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text)' }}>{product.name}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Image Gallery */}
        <div>
          <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <img src={mainImg} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {(() => { const imgs = product.images?.length > 0 ? product.images : [1,2,3,4].map(i => `https://picsum.photos/seed/${product.id}-${i}/160/160`); return (
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {imgs.map((url: string, i: number) => (
              <img key={i} src={url} alt="" onClick={() => setMainImg(url)} loading="lazy"
                style={{ width: 64, height: 64, borderRadius: '0.5rem', objectFit: 'cover', cursor: 'pointer', flexShrink: 0, border: mainImg === url ? '2px solid var(--primary)' : '2px solid transparent' }} />
            ))}
          </div>
          );})()}
        </div>

        {/* Product Info */}
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500, marginBottom: '0.5rem' }}>{product.brand}</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{product.name}</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>SKU: {product.sku}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1,2,3,4,5].map(i => <Star key={i} size={18} fill={i <= 4 ? 'var(--warning)' : 'none'} color={i <= 4 ? 'var(--warning)' : 'var(--border)'} />)}
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>4.2 (23 reviews)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>UGX {price.toLocaleString()}</span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </span>
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Options</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {product.variants.map((v: any) => (
                  <button key={v.id} className={`btn ${selectedVariant?.id === v.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSelectedVariant(v)}>{v.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span style={{ padding: '0.5rem 1rem', minWidth: 40, textAlign: 'center' }}>{quantity}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            {user ? (
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.875rem', fontSize: '1rem' }} onClick={addToCart}>
                {addedToCart ? <><Check size={20} /> Added!</> : <><ShoppingCart size={20} /> Add to Cart</>}
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary" style={{ flex: 1, padding: '0.875rem', fontSize: '1rem', justifyContent: 'center' }}>
                <ShoppingCart size={20} /> Sign In to Purchase
              </Link>
            )}
            <button className="btn btn-secondary btn-icon"><Heart size={20} /></button>
            <button className="btn btn-secondary btn-icon"><Share2 size={20} /></button>
          </div>

          {/* Delivery Info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Truck size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem' }}>Free shipping on orders over UGX 150,000</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem' }}>30-day return policy</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>{product.description}</p>
          </div>

          {/* Features */}
          {product.features?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Features</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {product.features.map((f: string, i: number) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <Check size={16} color="var(--success)" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(product.specifications).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{key}: </span><span style={{ fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {product.reviews?.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Customer Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {product.reviews.map((r: any) => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill={i <= r.rating ? 'var(--warning)' : 'none'} color={i <= r.rating ? 'var(--warning)' : 'var(--border)'} />)}
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.title}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.content}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>- {r.customerName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Products */}
      {product.related?.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Related Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {product.related.map((p: any) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <img src={p.images?.[0] || `https://picsum.photos/seed/${p.id}/300/300`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.brand}</p>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</p>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9375rem' }}>UGX {p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}