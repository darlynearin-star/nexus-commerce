'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import ProductCard from '@/components/ProductCard';
import { categoryIcon } from '@/lib/category-icons';
import { Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react';

export default function StoreShopPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const storeSlug = params.storeSlug as string;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [parentSlug, setParentSlug] = useState(searchParams.get('parent') || '');
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('createdAt_desc');

  // Build category tree
  const catMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of allCategories) map.set(c.id, c);
    return map;
  }, [allCategories]);

  const topCategories = useMemo(() => allCategories.filter((c: any) => !c.parentId), [allCategories]);

  const childrenOf = (parentId: string) => allCategories.filter((c: any) => c.parentId === parentId);

  const selectedParent = useMemo(() => {
    if (!parentSlug) return null;
    return allCategories.find((c: any) => c.slug === parentSlug) || null;
  }, [parentSlug, allCategories]);

  // Breadcrumb trail
  const breadcrumb = useMemo(() => {
    if (!selectedParent) return [];
    const trail: any[] = [selectedParent];
    let current = selectedParent;
    while (current.parentId) {
      const p = catMap.get(current.parentId);
      if (p) { trail.unshift(p); current = p; }
      else break;
    }
    return trail;
  }, [selectedParent, catMap]);

  // Get visible sub-categories (one level deep from selected parent)
  const visibleChildren = useMemo(() => {
    if (!selectedParent) return [];
    return childrenOf(selectedParent.id);
  }, [selectedParent, allCategories]);

  // Parse sort value into sort field + order
  const sortField = sort.split('_')[0];
  const sortOrder = sort.split('_')[1] || 'desc';

  const fetchProducts = () => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = { page, limit: 12, sort: sortField, order: sortOrder };
    if (search) params.search = search;
    if (category) params.category = category;
    else if (parentSlug) params.parent = parentSlug;
    storeApi.get('/products', params).then((r: any) => { setProducts(r.data || []); setTotalPages(r.meta?.totalPages || 1); }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, sortField, sortOrder, category, parentSlug]);
  useEffect(() => { storeApi.get('/categories').then((r: any) => setAllCategories(r.data || [])).catch((e: any) => console.error('API error:', e)); }, []);

  const productCount = products.length;

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '2rem 0' }}>
      <div className="container">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Link href={`/store/${storeSlug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>All</Link>
            {breadcrumb.map((c: any, i: number) => (
              <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <ChevronRight size={12} />
                {i === breadcrumb.length - 1 ? (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.name}</span>
                ) : (
                  <Link href={`/store/${storeSlug}/shop?parent=${c.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.name}</Link>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Top-level category chips */}
        {!selectedParent && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {topCategories.map((cat: any) => (
              <Link key={cat.id} href={`/store/${storeSlug}/shop?parent=${cat.slug}`} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
                <span>{categoryIcon(cat.slug, cat.name)}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Sub-category grid when a parent is selected */}
        {visibleChildren.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {visibleChildren.map((child: any) => {
              const grandkids = childrenOf(child.id);
              const href = grandkids.length > 0 ? `/store/${storeSlug}/shop?parent=${child.slug}` : `/store/${storeSlug}/shop?category=${child.slug}`;
              return (
                <Link key={child.id} href={href}
                  className={`btn btn-sm ${category === child.slug ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span>{categoryIcon(child.slug, child.name)}</span>
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Search + Sort bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchProducts()} />
            {search && <X size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setSearch(''); fetchProducts(); }} />}
          </div>
          <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '0.75rem' }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No products found</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{productCount} product{productCount !== 1 ? 's' : ''} found</p>
            <div className="product-grid">
              {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className={`btn ${page === i + 1 ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
