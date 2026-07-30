'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '@/lib/store-api';
import ProductCard from '@/components/ProductCard';
import { categoryIcon } from '@/lib/category-icons';
import { Search, SlidersHorizontal, X, ChevronRight, Filter, RotateCcw } from 'lucide-react';

interface AttributeDef {
  key: string; label: string;
  type: 'select' | 'multiselect' | 'text' | 'boolean' | 'number';
  options?: { label: string; value: string }[]; placeholder?: string; unit?: string;
}

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
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const catMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of allCategories) map.set(c.id, c);
    return map;
  }, [allCategories]);

  const topCategories = useMemo(() => allCategories.filter((c: any) => !c.parentId), [allCategories]);

  const childrenOf = useCallback((parentId: string) => allCategories.filter((c: any) => c.parentId === parentId), [allCategories]);

  const selectedParent = useMemo(() => {
    if (!parentSlug) return null;
    return allCategories.find((c: any) => c.slug === parentSlug) || null;
  }, [parentSlug, allCategories]);

  const selectedCategory = useMemo(() => {
    if (!category) return null;
    return allCategories.find((c: any) => c.slug === category) || null;
  }, [category, allCategories]);

  const breadcrumb = useMemo(() => {
    if (!selectedParent && !selectedCategory) return [];
    const target = selectedCategory || selectedParent;
    const trail: any[] = [target];
    let current = target;
    while (current.parentId) {
      const p = catMap.get(current.parentId);
      if (p) { trail.unshift(p); current = p; }
      else break;
    }
    return trail;
  }, [selectedParent, selectedCategory, catMap]);

  const visibleChildren = useMemo(() => {
    if (!selectedParent) return [];
    return childrenOf(selectedParent.id);
  }, [selectedParent, allCategories, childrenOf]);

  const sortField = sort.split('_')[0];
  const sortOrder = sort.split('_')[1] || 'desc';

  useEffect(() => {
    if (category) {
      storeApi.get<{ data: AttributeDef[] }>(`/categories/${category}/attributes`)
        .then(r => setAttributes(r.data || []))
        .catch(() => setAttributes([]));
    } else {
      setAttributes([]);
    }
    setSpecFilters({});
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  }, [category]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = { page, limit: 12, sort: sortField, order: sortOrder };
    if (search) params.search = search;
    if (category) params.category = category;
    else if (parentSlug) params.parent = parentSlug;
    if (priceMin) params.minPrice = priceMin;
    if (priceMax) params.maxPrice = priceMax;
    for (const [key, val] of Object.entries(specFilters)) {
      if (val) params[`spec_${key}`] = val;
    }
    storeApi.get('/products', params)
      .then((r: any) => { setProducts(r.data || []); setTotalPages(r.meta?.totalPages || 1); })
      .catch((e: any) => console.error('API error:', e))
      .finally(() => setLoading(false));
  }, [page, sortField, sortOrder, category, parentSlug, search, priceMin, priceMax, specFilters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    storeApi.get('/categories')
      .then((r: any) => setAllCategories(r.data || []))
      .catch((e: any) => console.error('API error:', e));
  }, []);

  const handleSpecChange = (key: string, value: string) => {
    setSpecFilters(prev => {
      if (!value) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  };

  const activeFilterCount = Object.keys(specFilters).length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const clearAllFilters = () => {
    setSpecFilters({});
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  };

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
        {!selectedParent && !selectedCategory && (
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
        {visibleChildren.length > 0 && !category && (
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

        {/* Search + Sort + Filter toggle bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
          {(category || parentSlug) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)} style={{ position: 'relative' }}>
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="badge badge-primary" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', minWidth: '1rem', height: '1rem', padding: '0 0.25rem', fontSize: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
              )}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Filter Sidebar */}
          {(category || parentSlug) && showFilters && (
            <div style={{ width: 260, minWidth: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', position: 'sticky', top: '5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Filters</h3>
                {activeFilterCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ fontSize: '0.75rem', gap: '0.25rem' }}>
                    <RotateCcw size={12} /> Clear
                  </button>
                )}
              </div>

              {/* Price range */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Price Range (UGX)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input" style={{ fontSize: '0.8125rem' }} placeholder="Min" type="number" min="0" value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1); }} />
                  <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>-</span>
                  <input className="input" style={{ fontSize: '0.8125rem' }} placeholder="Max" type="number" min="0" value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1); }} />
                </div>
              </div>

              {/* Dynamic attribute filters */}
              {attributes.map(attr => (
                <div key={attr.key} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{attr.label}</label>

                  {attr.type === 'select' && (
                    <select className="input" style={{ fontSize: '0.8125rem' }} value={specFilters[attr.key] || ''} onChange={e => handleSpecChange(attr.key, e.target.value)}>
                      <option value="">All</option>
                      {attr.options?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}

                  {attr.type === 'multiselect' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 180, overflowY: 'auto' }}>
                      {attr.options?.map(o => {
                        const selected = specFilters[attr.key]?.split(',').includes(o.value) || false;
                        return (
                          <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                            <input type="checkbox" checked={selected} onChange={() => {
                              const current = specFilters[attr.key] ? specFilters[attr.key].split(',') : [];
                              const next = selected ? current.filter(v => v !== o.value) : [...current, o.value];
                              handleSpecChange(attr.key, next.join(',') || '');
                            }} style={{ accentColor: 'var(--primary)' }} />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {attr.type === 'text' && (
                    <input className="input" style={{ fontSize: '0.8125rem' }} placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`} value={specFilters[attr.key] || ''} onChange={e => handleSpecChange(attr.key, e.target.value)} />
                  )}

                  {attr.type === 'number' && (
                    <input className="input" style={{ fontSize: '0.8125rem' }} type="number" placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`} value={specFilters[attr.key] || ''} onChange={e => handleSpecChange(attr.key, e.target.value)} />
                  )}

                  {attr.type === 'boolean' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={specFilters[attr.key] === 'yes'} onChange={e => handleSpecChange(attr.key, e.target.checked ? 'yes' : '')} style={{ accentColor: 'var(--primary)' }} />
                      Yes
                    </label>
                  )}
                </div>
              ))}

              {attributes.length === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No specific filters for this category</p>
              )}
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active filters:</span>
                {Object.entries(specFilters).map(([key, val]) => {
                  const def = attributes.find(a => a.key === key);
                  const label = def?.label || key;
                  return (
                    <span key={key} className="badge badge-primary" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={() => handleSpecChange(key, '')}>
                      {label}: {val}
                      <X size={12} />
                    </span>
                  );
                })}
                {priceMin && (
                  <span className="badge badge-primary" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={() => { setPriceMin(''); setPage(1); }}>
                    Min: UGX {Number(priceMin).toLocaleString()}
                    <X size={12} />
                  </span>
                )}
                {priceMax && (
                  <span className="badge badge-primary" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={() => { setPriceMax(''); setPage(1); }}>
                    Max: UGX {Number(priceMax).toLocaleString()}
                    <X size={12} />
                  </span>
                )}
              </div>
            )}

            {/* Products */}
            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '0.75rem' }} />)}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <SlidersHorizontal size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>No products found</p>
                {activeFilterCount > 0 && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={clearAllFilters}>Clear all filters</button>
                )}
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{productCount} product{productCount !== 1 ? 's' : ''} found</p>
                <div className="product-grid">
                  {products.map((p: any) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
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
      </div>
    </div>
  );
}
