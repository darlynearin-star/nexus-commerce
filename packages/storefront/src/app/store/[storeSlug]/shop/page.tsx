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

  // Overlay draft state (committed only on Apply)
  const [draftCategory, setDraftCategory] = useState('');
  const [draftAttributes, setDraftAttributes] = useState<AttributeDef[]>([]);
  const [draftSpecFilters, setDraftSpecFilters] = useState<Record<string, string>>({});
  const [draftPriceMin, setDraftPriceMin] = useState('');
  const [draftPriceMax, setDraftPriceMax] = useState('');

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

  const sortField = sort.split('_')[0];
  const sortOrder = sort.split('_')[1] || 'desc';

  // Sync URL params -> state on navigation
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const par = searchParams.get('parent') || '';
    const srch = searchParams.get('search') || '';
    setCategory(cat);
    setParentSlug(par);
    setSearch(srch);
    setSpecFilters({});
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  }, [searchParams]);

  // Load attributes for the committed category
  useEffect(() => {
    if (category) {
      storeApi.get<{ data: AttributeDef[] }>(`/categories/${category}/attributes`)
        .then(r => setAttributes(r.data || []))
        .catch(() => setAttributes([]));
    } else {
      setAttributes([]);
    }
  }, [category]);

  const loadAttributesFor = useCallback((slug: string) => {
    if (!slug) {
      setDraftAttributes([]);
      return Promise.resolve();
    }
    return storeApi.get<{ data: AttributeDef[] }>(`/categories/${slug}/attributes`)
      .then(r => setDraftAttributes(r.data || []))
      .catch(() => setDraftAttributes([]));
  }, []);

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

  // Subcategory options for the overlay dropdown (children of current parent, or siblings of selected category)
  const overlaySubcategories = useMemo(() => {
    if (selectedParent) return childrenOf(selectedParent.id);
    if (selectedCategory?.parentId) {
      const p = catMap.get(selectedCategory.parentId);
      return p ? childrenOf(p.id) : [];
    }
    return [];
  }, [selectedParent, selectedCategory, childrenOf, catMap]);

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

  const handleDraftSpecChange = (key: string, value: string) => {
    setDraftSpecFilters(prev => {
      if (!value) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const openFilters = () => {
    setDraftCategory(category);
    setDraftSpecFilters(specFilters);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);
    setDraftAttributes(attributes);
    setShowFilters(true);
  };

  const closeFilters = () => setShowFilters(false);

  const applyFilters = () => {
    setCategory(draftCategory);
    setSpecFilters(draftSpecFilters);
    setPriceMin(draftPriceMin);
    setPriceMax(draftPriceMax);
    setPage(1);
    setShowFilters(false);
  };

  const handleDraftCategoryChange = (slug: string) => {
    setDraftCategory(slug);
    setDraftSpecFilters({});
    setDraftPriceMin('');
    setDraftPriceMax('');
    loadAttributesFor(slug);
  };

  const activeFilterCount = Object.keys(specFilters).length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const draftActiveCount = Object.keys(draftSpecFilters).length + (draftPriceMin ? 1 : 0) + (draftPriceMax ? 1 : 0);

  const clearAllFilters = () => {
    setSpecFilters({});
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  };

  const clearDraftFilters = () => {
    setDraftSpecFilters({});
    setDraftPriceMin('');
    setDraftPriceMax('');
  };

  const productCount = products.length;

  const renderAttrControl = (attr: AttributeDef, value: string, onChange: (v: string) => void) => {
    if (attr.type === 'select') {
      return (
        <select className="input" style={{ fontSize: '0.8125rem' }} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">All</option>
          {attr.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    if (attr.type === 'multiselect') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 180, overflowY: 'auto' }}>
          {attr.options?.map(o => {
            const selected = value?.split(',').includes(o.value) || false;
            return (
              <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                <input type="checkbox" checked={selected} onChange={() => {
                  const current = value ? value.split(',') : [];
                  const next = selected ? current.filter(v => v !== o.value) : [...current, o.value];
                  onChange(next.join(',') || '');
                }} style={{ accentColor: 'var(--primary)' }} />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    }
    if (attr.type === 'text') {
      return <input className="input" style={{ fontSize: '0.8125rem' }} placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`} value={value} onChange={e => onChange(e.target.value)} />;
    }
    if (attr.type === 'number') {
      return <input className="input" style={{ fontSize: '0.8125rem' }} type="number" placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`} value={value} onChange={e => onChange(e.target.value)} />;
    }
    if (attr.type === 'boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={value === 'yes'} onChange={e => onChange(e.target.checked ? 'yes' : '')} style={{ accentColor: 'var(--primary)' }} />
          Yes
        </label>
      );
    }
    return null;
  };

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
            <button className="btn btn-ghost btn-sm" onClick={openFilters} style={{ position: 'relative' }}>
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="badge badge-primary" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', minWidth: '1rem', height: '1rem', padding: '0 0.25rem', fontSize: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
              )}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
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

      {/* Filter Overlay */}
      {showFilters && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={closeFilters}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Overlay header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Filters</h3>
              {draftActiveCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearDraftFilters} style={{ fontSize: '0.75rem', gap: '0.25rem' }}>
                  <RotateCcw size={12} /> Clear
                </button>
              )}
              <button className="btn btn-ghost btn-icon" onClick={closeFilters} aria-label="Close filters"><X size={18} /></button>
            </div>

            {/* Overlay body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {/* Step 1: Subcategory dropdown */}
              {overlaySubcategories.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Subcategory</label>
                  <select className="input" style={{ fontSize: '0.875rem' }} value={draftCategory} onChange={e => handleDraftCategoryChange(e.target.value)}>
                    <option value="">All Subcategories</option>
                    {overlaySubcategories.map((c: any) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 2: Special filters for selected subcategory */}
              {draftCategory && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Specific Filters
                  </h4>
                  {draftAttributes.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No specific filters for this subcategory</p>
                  ) : (
                    draftAttributes.map(attr => (
                      <div key={attr.key} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{attr.label}</label>
                        {renderAttrControl(attr, draftSpecFilters[attr.key] || '', v => handleDraftSpecChange(attr.key, v))}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Step 3: General filters */}
              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  General
                </h4>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Price Range (UGX)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" style={{ fontSize: '0.8125rem' }} placeholder="Min" type="number" min="0" value={draftPriceMin} onChange={e => setDraftPriceMin(e.target.value)} />
                    <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>-</span>
                    <input className="input" style={{ fontSize: '0.8125rem' }} placeholder="Max" type="number" min="0" value={draftPriceMax} onChange={e => setDraftPriceMax(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay footer */}
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={closeFilters}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
