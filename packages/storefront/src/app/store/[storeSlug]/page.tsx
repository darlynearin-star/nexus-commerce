'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import { useStore } from '@/lib/store-context';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from 'lucide-react';
import { categoryIcon } from '@/lib/category-icons';

export default function StoreHomePage() {
  const { store } = useStore();
  const [featured, setFeatured] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const storeSlug = store?.slug || (typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : '');

  useEffect(() => {
    storeApi.get('/products/featured/list').then((r: any) => setFeatured(r.data || [])).catch((e: any) => console.error('API error:', e));
    storeApi.get('/products/new/list').then((r: any) => setNewArrivals(r.data || [])).catch((e: any) => console.error('API error:', e));
    storeApi.get('/categories', { sortBy: 'productCount' }).then((r: any) => setCategories(r.data || [])).catch((e: any) => console.error('API error:', e));
  }, []);

  const storeName = store?.name || 'Store';

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Hero */}
      <section className="hero-overlay" style={{ textAlign: 'center', padding: '5rem 1rem 4rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.75rem' }}>
          Welcome to <span className="gradient-gold">{storeName}</span>
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 2rem' }}>
          Discover curated fashion, accessories, and body ornaments crafted for every occasion.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/store/${store?.slug}/shop`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            Shop Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section style={{ padding: '3rem 1rem' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Featured</h2>
              <Link href={`/store/${store?.slug}/shop`} style={{ color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none' }}>View All →</Link>
            </div>
            <div className="product-grid">
              {featured.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
            </div>
          </div>
        </section>
      )}

      {/* Quick Browse — top-level categories sorted by product count */}
      {categories.length > 0 && (
        <section style={{ padding: '3rem 1rem', background: 'var(--bg-secondary)' }}>
          <div className="container">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Quick Browse</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {categories.filter((c: any) => !c.parentId).sort((a: any, b: any) => (b._count?.products || 0) - (a._count?.products || 0)).map((cat: any) => (
                <Link key={cat.id} href={`/store/${store?.slug}/shop?parent=${cat.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{categoryIcon(cat.slug, cat.name)}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{cat._count?.products || 0} items</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section style={{ padding: '3rem 1rem', background: 'var(--bg-secondary)' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>New Arrivals</h2>
              <Link href={`/store/${store?.slug}/shop`} style={{ color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none' }}>View All →</Link>
            </div>
            <div className="product-grid">
              {newArrivals.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
