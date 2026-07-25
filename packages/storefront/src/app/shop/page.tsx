'use client';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

function ShopContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('createdAt');
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    setLoading(true);
    api.get('/products', { search: search || undefined, category: category || undefined, page, limit: 12, sort })
      .then((res: any) => { setProducts(res.data); setTotalPages(res.meta.totalPages); setTotal(res.meta.total); })
      .finally(() => setLoading(false));
  }, [search, category, page, sort]);

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{category ? category : search ? `Search: "${search}"` : 'All Products'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{total} products found</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16} /> Filters</button>
          <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="createdAt">Newest</option>
            <option value="price">Price: Low to High</option>
            <option value="price&order=desc">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showFilters ? '250px 1fr' : '1fr', gap: '1.5rem' }}>
        {showFilters && (
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Filters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Price Range</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}><input className="input" placeholder="Min" type="number" style={{ width: '50%' }} /><input className="input" placeholder="Max" type="number" style={{ width: '50%' }} /></div>
              </div>
              <button className="btn btn-primary btn-sm">Apply Filters</button>
            </div>
          </div>
        )}
        <div>
          {loading ? (
            <div className="product-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '1', marginBottom: '0.5rem' }} /><div className="skeleton" style={{ height: 20, width: '60%', marginBottom: '0.25rem' }} /><div className="skeleton" style={{ height: 28, width: '40%' }} /></div>)}</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}><p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p><h3>No products found</h3><p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or filters</p></div>
          ) : (
            <>
              <div className="product-grid">{products.map((p: any) => <ProductCard key={p.id} product={p} />)}</div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} className={`btn ${page === i + 1 ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '3rem 0' }}><div className="skeleton" style={{ height: 400 }} /></div>}>
      <ShopContent />
    </Suspense>
  );
}
