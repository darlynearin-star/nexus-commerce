'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import { useStore } from '@/lib/store-context';
import ProductCard from '@/components/ProductCard';
import StoreHero from '@/components/StoreHero';
import { CategoryIcon } from '@/lib/category-icons';

export default function StoreHomeClient({ initialFeatured, initialNewArrivals, initialCategories, initialLatest }: {
  initialFeatured: any[];
  initialNewArrivals: any[];
  initialCategories: any[];
  initialLatest?: any[];
}) {
  const { store } = useStore();
  const [featured, setFeatured] = useState<any[]>(initialFeatured);
  const [newArrivals, setNewArrivals] = useState<any[]>(initialNewArrivals);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [latest, setLatest] = useState<any[]>(initialLatest || []);
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
    if ((initialLatest || []).length === 0) {
      storeApi.get('/products', { limit: 24, sort: 'createdAt', order: 'desc' }).then((r: any) => setLatest(r.data || [])).catch(() => {});
    }
  }, []);

  /**
   * Category tiles.
   *
   * The categories endpoint returns counts but no imagery, and there is no
   * store banner field, so the only photography we can reach without extra
   * API calls is what the products already carry. Products are tagged with
   * their (possibly child) category, so each image is walked up to its root
   * category before being used as that tile's photograph.
   *
   * A mixed grid of photo tiles and icon tiles looks broken, so photographs
   * are all-or-nothing: three or more photographed categories switches the
   * whole grid over; otherwise every tile keeps the icon treatment.
   */
  const categoryGrid = useMemo(() => {
    const byId = new Map<string, any>(categories.map((c: any) => [c.id, c]));
    const rootOf = (id?: string | null) => {
      let c = id ? byId.get(id) : undefined;
      let guard = 0;
      while (c?.parentId && guard++ < 6) c = byId.get(c.parentId);
      return c?.id as string | undefined;
    };

    const photoFor = new Map<string, string>();
    for (const p of [...featured, ...newArrivals, ...latest]) {
      const src = p?.images?.[0];
      if (!src || !p?.categoryId) continue;
      const root = rootOf(p.categoryId);
      if (root && !photoFor.has(root)) photoFor.set(root, src);
    }

    const topLevel = categories.filter((c: any) => !c.parentId);
    const withStock = topLevel.filter((c: any) => (c.productCount || 0) > 0);

    const photographed = withStock
      .filter((c: any) => photoFor.has(c.id))
      .map((c: any) => ({ ...c, image: photoFor.get(c.id) }));

    if (photographed.length >= 3) {
      return { tiles: photographed.slice(0, 6), photographic: true };
    }
    return { tiles: (withStock.length ? withStock : topLevel).slice(0, 8), photographic: false };
  }, [categories, featured, newArrivals, latest]);

  const primaryRail = (newArrivals.length > 0 ? newArrivals : featured.length > 0 ? featured : latest).slice(0, 8);
  const railLabel = newArrivals.length > 0 ? 'Just in' : featured.length > 0 ? 'Curated' : 'The shop';
  const railTitle = newArrivals.length > 0 ? 'New arrivals' : featured.length > 0 ? 'Featured' : 'Latest pieces';

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <StoreHero store={store} featured={featured} newArrivals={newArrivals} latest={latest} />

      {categoryGrid.tiles.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-label">Browse</p>
                <h2 className="section-title">Shop by category</h2>
              </div>
              <Link href={`/store/${store?.slug}/shop`} className="section-link">View all →</Link>
            </div>

            {categoryGrid.photographic ? (
              <div className="category-tiles">
                {categoryGrid.tiles.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/store/${store?.slug}/shop?parent=${cat.slug}`}
                    className="category-tile"
                  >
                    <Image
                      src={cat.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                    />
                    <span className="category-tile__label">
                      <span className="category-tile__name">{cat.name}</span>
                      <span className="category-tile__count">{cat.productCount} items</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="category-tiles category-tiles--icons">
                {categoryGrid.tiles.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/store/${store?.slug}/shop?parent=${cat.slug}`}
                    className="category-tile"
                  >
                    <CategoryIcon slug={cat.slug} name={cat.name} size={30} />
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {cat.productCount || 0} items
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {primaryRail.length > 0 && (
        <section id="new-arrivals" className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-label">{railLabel}</p>
                <h2 className="section-title">{railTitle}</h2>
              </div>
              <Link href={`/store/${store?.slug}/shop`} className="section-link">View all →</Link>
            </div>
            <div className="product-grid">
              {primaryRail.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} showAddToCart={false} />)}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && featured.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-label">Curated</p>
                <h2 className="section-title">Featured</h2>
              </div>
              <Link href={`/store/${store?.slug}/shop`} className="section-link">View all →</Link>
            </div>
            <div className="product-grid">
              {featured.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} showAddToCart={false} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
