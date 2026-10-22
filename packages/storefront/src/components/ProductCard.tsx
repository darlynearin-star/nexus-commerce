'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Check, Heart, Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import { useAuth } from '@/lib/auth';
import StarRating from './StarRating';

export type ProductView = 'grid' | 'list' | 'compact' | 'minimal';

const img = (id: string) => `https://picsum.photos/seed/${id}/400/400`;
const firstImage = (p: any) => p.images?.[0] || img(p.id);
const secondImage = (p: any) => (Array.isArray(p.images) && p.images[1]) || null;
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
    compareAtPrice?: number | null;
    stock?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    isNew?: boolean;
    variants?: unknown[];
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

/**
 * Quick-add for the grid view.
 *
 * Products that carry variants cannot be added blind — they need a size or a
 * colour — so the same button becomes a link to the product page in that case.
 * Everything else adds the base product, which is exactly what the cart API
 * does with no variantId.
 */
function QuickAdd({ product, href }: { product: ProductCardProps['product']; href: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants) {
    return (
      <Link
        href={href}
        className="product-card__quick"
        aria-label={`Choose options for ${product.name}`}
        onClick={e => e.stopPropagation()}
      >
        <SlidersHorizontal size={16} />
      </Link>
    );
  }

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await storeApi.post('/cart/add', { productId: product.id });
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch (err: any) {
      console.error('Cart error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`product-card__quick${done ? ' is-done' : ''}`}
      onClick={add}
      aria-label={done ? 'Added to cart' : `Add ${product.name} to cart`}
    >
      {done ? <Check size={16} /> : <Plus size={16} />}
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
      style={{ position: 'absolute', top, right, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: saved ? 'var(--error)' : 'var(--text-secondary)', padding: '0.375rem', borderRadius: 'var(--radius-pill)', zIndex: 3, lineHeight: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
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
      <Link href={href} className="card" style={{ display: 'flex', gap: '1rem', textDecoration: 'none', color: 'inherit', position: 'relative', padding: '0.75rem', alignItems: 'stretch', borderRadius: 'var(--radius-md)' }}>
        <HeartButton product={product} top="0.5rem" right="0.5rem" />
        <div style={{ width: 'clamp(90px, 18vw, 160px)', minHeight: 'clamp(90px, 18vw, 160px)', aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
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
      <Link href={href} className="card" style={{ ...base, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
        <HeartButton product={product} top="0.375rem" right="0.375rem" />
        <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
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
      <Link href={href} className="card" style={{ ...base, display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: 'var(--radius-md)' }}>
        <HeartButton product={product} top="0.5rem" right="0.5rem" />
        <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
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

  // GRID (default): 4:5 portrait media, second photograph on hover, quick-add.
  //
  // The card is an <article> with a stretched link overlay instead of one big
  // <a>: the wishlist and quick-add controls are interactive, and nesting a
  // <button> inside an anchor is invalid and awkward for screen readers.
  const alt = secondImage(product);
  const tracked = product.trackInventory !== false;
  const stock = typeof product.stock === 'number' ? product.stock : undefined;
  // Deliberately no "sold out" state here. cart.ts only rejects a quantity
  // above `stock` when stock is greater than zero, so stock 0 means "not
  // enforced" (and merchant dashboards default new products to 0). Badging
  // those as sold out would empty the storefront of every fresh listing and
  // contradict the add-to-cart button on the product page.
  const lowStock = tracked && stock !== undefined && stock > 0 && stock <= (product.lowStockThreshold ?? 10);
  const compareAt = product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : null;
  const discountPct = compareAt ? Math.round((1 - product.price / compareAt) * 100) : 0;

  const chip = discountPct >= 1
    ? { label: `−${discountPct}%`, muted: false }
    : product.isNew
      ? { label: 'New', muted: false }
      : lowStock
        ? { label: 'Low stock', muted: true }
        : null;

  return (
    <article className="card product-card">
      <div className="product-card__media">
        <Image
          src={firstImage(product)}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="product-card__img"
          onError={e => { (e.target as HTMLImageElement).src = img((product as any).id); }}
        />
        {alt && (
          <Image
            src={alt}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="product-card__img product-card__img--alt"
          />
        )}
        {chip && (
          <span className={`product-card__chip${chip.muted ? ' product-card__chip--muted' : ''}`}>
            {chip.label}
          </span>
        )}
        <HeartButton product={product} top="0.6rem" right="0.6rem" />
        <QuickAdd product={product} href={href} />
      </div>

      <div className="product-card__body">
        {product.brand && <p className="product-card__brand">{product.brand}</p>}
        <h3 className="product-card__name">{product.name}</h3>
        {(product.averageRating || product.reviewCount) && (
          <StarRating rating={product.averageRating || 4} count={product.reviewCount || 0} size={12} />
        )}
        <div className="product-card__price">
          <span>UGX {product.price.toLocaleString()}</span>
          {compareAt && <s>UGX {compareAt.toLocaleString()}</s>}
        </div>
      </div>

      <Link href={href} className="product-card__hit" aria-label={`View ${product.name}`} />
    </article>
  );
}
