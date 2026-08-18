'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import { useAuth } from '@/lib/auth';
import StarRating from './StarRating';

export type ProductView = 'grid' | 'list' | 'compact' | 'minimal';

const img = (id: string) => `https://picsum.photos/seed/${id}/400/400`;
const firstImage = (p: any) => p.images?.[0] || img(p.id);
const truncate = (s: string, n: number) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    price: number;
    description?: string;
    images?: string[];
    averageRating?: number;
    reviewCount?: number;
  };
  showAddToCart?: boolean;
  storeSlug?: string;
  view?: ProductView;
}

function AddToCartButton({ product }: { product: ProductCardProps['product'] }) {
  const [added, setAdded] = useState(false);
  const add = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      setAdded(false);
      await storeApi.post('/cart/add', { productId: product.id });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) { console.error('Cart error:', err); }
  };
  return (
    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={add}>
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  );
}

function HeartButton({ product, top, right }: { product: ProductCardProps['product']; top: string; right: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { window.location.href = '/login'; return; }
        setSaved(p => !p);
        if (!saved) {
          storeApi.post('/wishlist/add', { productId: product.id }).catch(() => setSaved(false));
        } else {
          storeApi.post('/wishlist/remove', { productId: product.id }).catch(() => setSaved(true));
        }
      }}
      style={{ position: 'absolute', top, right, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: saved ? 'var(--error)' : 'var(--text-secondary)', padding: '0.375rem', borderRadius: 999, zIndex: 1, lineHeight: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      aria-label="Toggle wishlist"
    >
      <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function ProductCard({ product, showAddToCart = true, storeSlug: propSlug, view = 'grid' }: ProductCardProps) {
  const storeSlug = propSlug || (typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') || 'adorn' : 'adorn');
  const href = `/store/${storeSlug}/product/${product.slug}`;

  const base = {
    textDecoration: 'none' as const,
    color: 'inherit',
    position: 'relative' as const,
  };

  // LIST: horizontal layout, image left, details right. Best for scanning many products.
  if (view === 'list') {
    return (
      <Link href={href} className="card" style={{ display: 'flex', gap: '1rem', textDecoration: 'none', color: 'inherit', position: 'relative', padding: '0.75rem', alignItems: 'stretch', borderRadius: 10 }}>
        <HeartButton product={product} top="0.5rem" right="0.5rem" />
        <div style={{ width: 'clamp(90px, 18vw, 160px)', minHeight: 'clamp(90px, 18vw, 160px)', aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          <Image src={firstImage(product)} alt={product.name} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = img((product as any).id); }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingRight: '1.75rem' }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{product.brand}</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>{product.name}</h3>
          {(product.averageRating || product.reviewCount) && (
            <div><StarRating rating={product.averageRating || 4} count={product.reviewCount || 0} size={12} /></div>
          )}
          {product.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{truncate(product.description, 120)}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '1.0625rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>UGX {product.price.toLocaleString()}</span>
            {showAddToCart && <div style={{ marginLeft: 'auto', width: 'min(180px, 40%)' }}><AddToCartButton product={product} /></div>}
          </div>
        </div>
      </Link>
    );
  }

  // MINIMAL: image, name, price only: cleanest, most lightweight.
  if (view === 'minimal') {
    return (
      <Link href={href} className="card" style={{ ...base, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', borderRadius: 10 }}>
        <HeartButton product={product} top="0.375rem" right="0.375rem" />
        <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <Image src={firstImage(product)} alt={product.name} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = img((product as any).id); }} />
        </div>
        <div style={{ padding: '0 0.25rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{product.name}</h3>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>UGX {product.price.toLocaleString()}</span>
        </div>
      </Link>
    );
  }

  // COMPACT: denser card for shop floors with lots of products.
  if (view === 'compact') {
    return (
      <Link href={href} className="card" style={{ ...base, display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: 10 }}>
        <HeartButton product={product} top="0.5rem" right="0.5rem" />
        <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <Image src={firstImage(product)} alt={product.name} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = img((product as any).id); }} />
        </div>
        <div>
          <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>{product.brand}</p>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{product.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>UGX {product.price.toLocaleString()}</span>
          </div>
        </div>
        {showAddToCart && <AddToCartButton product={product} />}
      </Link>
    );
  }

  // GRID (default): full-featured card, balanced for product browsing.
  return (
    <Link href={href} className="card" style={{ ...base, display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.625rem', borderRadius: 12 }}>
      <HeartButton product={product} top="0.5rem" right="0.5rem" />
      <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <Image src={firstImage(product)} alt={product.name} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = img((product as any).id); }} />
      </div>
      <div style={{ padding: '0 0.25rem 0.125rem' }}>
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>{product.brand}</p>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>{product.name}</h3>
        {(product.averageRating || product.reviewCount) && (
          <div style={{ marginTop: '0.25rem' }}>
            <StarRating rating={product.averageRating || 4} count={product.reviewCount || 0} size={12} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
        <span style={{ fontSize: '1rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>UGX {product.price.toLocaleString()}</span>
      </div>
      {showAddToCart && <div style={{ padding: '0 0.25rem 0.25rem' }}><AddToCartButton product={product} /></div>}
    </Link>
  );
}