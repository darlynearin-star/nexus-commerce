'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import StarRating from './StarRating';

const img = (id: string) => `https://picsum.photos/seed/${id}/400/400`;

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    price: number;
    averageRating?: number;
    reviewCount?: number;
  };
  showAddToCart?: boolean;
}

export default function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  return (
    <Link href={`/product/${product.slug}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', color: 'inherit', position: 'relative' }}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem', zIndex: 1 }}
      >
        <Heart size={18} />
      </button>
      <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <img src={img(product.id)} alt={product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{product.brand}</p>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{product.name}</h3>
        {(product.averageRating || product.reviewCount) && (
          <div style={{ marginTop: '0.375rem' }}>
            <StarRating rating={product.averageRating || 4} count={product.reviewCount || 0} size={12} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>UGX {product.price.toLocaleString()}</span>
      </div>
      {showAddToCart && (
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          api.post('/cart/add', { productId: product.id });
        }}>
          Add to Cart
        </button>
      )}
    </Link>
  );
}
