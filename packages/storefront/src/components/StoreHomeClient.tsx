'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import { useStore } from '@/lib/store-context';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from 'lucide-react';
import { categoryIcon } from '@/lib/category-icons';

export default function StoreHomeClient({ initialFeatured, initialNewArrivals, initialCategories }: {
  initialFeatured: any[];
  initialNewArrivals: any[];
  initialCategories: any[];
}) {
  const { store } = useStore();
  const [featured, setFeatured] = useState<any[]>(initialFeatured);
  const [newArrivals, setNewArrivals] = useState<any[]>(initialNewArrivals);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const storeSlug: string = store?.slug || '';

  // Fallback: if SSR data was empty (API hiccup), hydrate client-side.
  useEffect(() => {
    if (initialFeatured.length === 0) {
      storeApi.get('/products/featured/list').then((r: any) => setFeatured(r.data || [])).catch(() => {});
    }
    if (initialNewArrivals.length === 0) {
      storeApi.get('/products/new/list').then((r: any) => setNewArrivals(r.data || [])).catch(() => {});
    }
    if (initialCategories.length === 0) {
      storeApi.get('/categories', { sortBy: 'productCount' }).then((r: any) => setCategories(r.data || [])).catch(() => {});
    }
  }, []);

  const storeName = store?.name || 'Store';

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <section className="hero-overlay" style={{ padding: 'clamp(3.5rem, 8vw, 5.5rem) 0' }}>
        <div className="container">
          <div style={{ maxWidth: 620 }}>
            <p className="eyebrow">Store</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Welcome to {storeName}
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.65, marginBottom: '2rem' }}>
              Discover carefully selected products crafted for every occasion.
            </p>
            <Link href={`/store/${store?.slug}/shop`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Shop Now <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {newArrivals.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Just in</p>
                <h2 className="section-title" style={{ fontSize: '1.5rem' }}>New Arrivals</h2>
              </div>
              <Link href={`/store/${store?.slug}/shop`} className="section-link">View All →</Link>
            </div>
            <div className="product-grid">
              {newArrivals.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} showAddToCart={false} />)}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-secondary)' }}>
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Curated</p>
                <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Featured</h2>
              </div>
              <Link href={`/store/${store?.slug}/shop`} className="section-link">View All →</Link>
            </div>
            <div className="product-grid">
              {featured.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} showAddToCart={false} />)}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Browse</p>
                <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Quick Browse</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1.25rem' }}>
              {categories.filter((c: any) => !c.parentId).map((cat: any) => (
                <Link key={cat.id} href={`/store/${store?.slug}/shop?parent=${cat.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', padding: '1.75rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '2rem', lineHeight: 1 }}>{categoryIcon(cat.slug, cat.name)}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cat.productCount || 0} items</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}