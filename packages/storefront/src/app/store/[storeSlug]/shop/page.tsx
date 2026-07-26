'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { storeApi } from '@/lib/store-api';
import ProductCard from '@/components/ProductCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function StoreShopPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('createdAt');

  const fetchProducts = () => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = { page, limit: 12, sort, order: 'desc' };
    if (search) params.search = search;
    if (category) params.category = category;
    storeApi.get('/products', params).then((r: any) => { setProducts(r.data || []); setTotalPages(r.meta?.totalPages || 1); }).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, sort, category]);
  useEffect(() => { storeApi.get('/categories').then((r: any) => setCategories(r.data || [])).catch((e: any) => console.error('API error:', e)); }, []);

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '2rem 0' }}>
      <div className="container">
        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchProducts()} />
            {search && <X size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setSearch(''); fetchProducts(); }} />}
          </div>
          <select className="input" style={{ width: 'auto' }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Products */}
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
          <div className="product-grid">
            {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
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
