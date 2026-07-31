'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Copy, Search, ExternalLink, Package, Link2, Check } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (p: any) => {
    const link = `https://nexus-storefront-dusky.vercel.app/store/${p.store?.slug || localStorage.getItem('activeStoreSlug')}/product/${p.slug}`;
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { console.error('Copy failed:', err); }
      document.body.removeChild(ta);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedId(p.id);
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => fallback());
    } else {
      fallback();
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/products', { limit: 100, status: statusFilter || undefined });
      setProducts(res.data);
    } catch (e: any) { setLoadError(e.message || 'Failed to load products'); } finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, [statusFilter]);

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/products/${id}`);
      alert(res.message || 'Product deleted');
      loadProducts();
    } catch (e: any) { alert(e.message || 'Failed to delete product'); }
  };

  const duplicateProduct = async (id: string) => {
    try {
      await api.post(`/products/${id}/duplicate`);
      loadProducts();
    } catch (e: any) { alert(e.message || 'Failed to duplicate product'); }
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{products.length} product{products.length !== 1 ? 's' : ''}</p></div>
        <Link href="/products/new" className="btn btn-primary btn-sm"><Plus size={16} /> Add Product</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name, SKU or brand..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Drafts</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      ) : loadError ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>{loadError}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadProducts}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>No products yet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
            {search || statusFilter ? 'No products match your search criteria. Try adjusting your filters.' : 'Start selling by adding your first product. You can add photos, set prices, and manage inventory.'}
          </p>
          {!search && !statusFilter && <Link href="/products/new" className="btn btn-primary"><Plus size={16} /> Add your first product</Link>}
          {(search || statusFilter) && <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>}
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container"><table className="table">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/products/${p.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '0.375rem', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                          {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '0.375rem' }} /> : '📦'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.brand || '\u00a0'}</p>
                        </div>
                      </Link>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.sku}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{p.category?.name || '-'}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>UGX {p.price?.toLocaleString()}</td>
                    <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-error'}`}>{p.stock > 0 ? p.stock : 'Out'}</span></td>
                    <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-success' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <Link href={`/products/${p.id}/edit`} className="btn btn-ghost btn-icon" title="Edit"><Edit2 size={14} /></Link>
                        <button className="btn btn-ghost btn-icon" onClick={() => copyLink(p)} title="Copy product link">{copiedId === p.id ? <Check size={14} style={{ color: 'var(--success, #4ade80)' }} /> : <Link2 size={14} />}</button>
                        <button className="btn btn-ghost btn-icon" onClick={() => duplicateProduct(p.id)} title="Duplicate"><Copy size={14} /></button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id)} title="Delete"><Trash2 size={14} /></button>
                        {p.store?.slug && <Link href={`https://nexus-storefront-dusky.vercel.app/store/${p.store.slug}/product/${p.slug}`} target="_blank" className="btn btn-ghost btn-icon" title="View on store"><ExternalLink size={14} /></Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </>
      )}
    </div>
  );
}
