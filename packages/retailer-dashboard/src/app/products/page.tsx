'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Copy, Search, ExternalLink, Package, Link2, Check, Upload } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkContent, setBulkContent] = useState('');
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setBulkOpen(!bulkOpen); setBulkPreview(null); setBulkResult(null); setBulkError(null); }}><Upload size={16} /> Bulk upload</button>
          <Link href="/products/new" className="btn btn-primary btn-sm"><Plus size={16} /> Add Product</Link>
        </div>
      </div>

      {bulkOpen && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Bulk upload products</h2>
            <a href="/pdtguide.txt" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8125rem' }}>View the file guide</a>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Paste your product file contents or choose a .txt file. Nothing is saved until you press Import — imported products land as drafts you can edit and add photos to.
          </p>
          <input type="file" accept=".txt,.pdt,text/plain" aria-label="Choose product file" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem', display: 'block' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setBulkContent(String(reader.result || '')); reader.readAsText(f); }} />
          <textarea className="input" aria-label="Product file contents" rows={10} style={{ fontFamily: 'monospace', fontSize: '0.8125rem', whiteSpace: 'pre', marginBottom: '0.75rem' }}
            placeholder={'---\nname: African Print Dress\nprice: 45000\ncategory: Dresses\nstock: 12\nfeatured: yes\ndescription: |\n  Handmade in Kampala.\n---\nname: Next product\nprice: 20000'}
            value={bulkContent} onChange={(e) => setBulkContent(e.target.value)} />
          {bulkError && <p style={{ color: 'var(--error)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{bulkError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" disabled={!bulkContent.trim() || bulkParsing}
              onClick={async () => {
                setBulkParsing(true); setBulkError(null); setBulkResult(null);
                try { const r = await api.post('/products/bulk-preview', { content: bulkContent }); setBulkPreview(r.data); }
                catch (e: any) { setBulkError(e.message || 'Parse failed'); } finally { setBulkParsing(false); }
              }}>{bulkParsing ? 'Checking…' : '1. Parse & Preview'}</button>
            <button className="btn btn-primary btn-sm" disabled={!bulkPreview || bulkImporting || !bulkPreview?.data?.rows?.some((r: any) => r.errors.length === 0)}
              onClick={async () => {
                setBulkImporting(true); setBulkError(null);
                try { const r = await api.post('/products/bulk-import', { content: bulkContent }); setBulkResult(r.data); await loadProducts(); }
                catch (e: any) { setBulkError(e.message || 'Import failed'); } finally { setBulkImporting(false); }
              }}>{bulkImporting ? 'Importing…' : '2. Import'}</button>
          </div>

          {bulkPreview && (
            <div style={{ marginTop: '1rem' }}>
              {bulkPreview.data.fileIssues?.length > 0 && bulkPreview.data.fileIssues.map((i: any, k: number) => (
                <p key={k} style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{i.message}</p>
              ))}
              <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 320 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Status</th><th style={{ padding: '0.5rem 0.75rem' }}>Name</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Price</th><th style={{ padding: '0.5rem 0.75rem' }}>Category</th>
                  </tr></thead>
                  <tbody>
                    {bulkPreview.data.rows.map((r: any, k: number) => (
                      <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{r.errors.length === 0 ? <span style={{ color: 'var(--success)' }}>✓ Ready</span> : <span style={{ color: 'var(--error)' }}>✗ {r.errors.length} error{r.errors.length !== 1 ? 's' : ''}</span>}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{r.name || <em>(no name)</em>}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{String(r.price)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{r.category ? `${r.category} (${r.categoryAction})` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bulkPreview.data.rows.some((r: any) => r.errors.length > 0) && (
                <details style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--error)' }}>Show error details</summary>
                  {bulkPreview.data.rows.filter((r: any) => r.errors.length > 0).map((r: any, k: number) => (
                    <div key={k} style={{ marginTop: '0.5rem' }}>
                      <strong>{r.name || `Line ${r.startLine}`}</strong>
                      {r.errors.map((e: any, j: number) => <div key={j} style={{ color: 'var(--error)' }}>Line {e.line}: {e.message}</div>)}
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}

          {bulkResult && (
            <div className="card" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Imported {bulkResult.data.createdCount} product{bulkResult.data.createdCount !== 1 ? 's' : ''} as draft{bulkResult.data.createdCount !== 1 ? 's' : ''}{bulkResult.data.skippedCount > 0 ? ` · skipped ${bulkResult.data.skippedCount}` : ''}</p>
              {bulkResult.data.newCategories?.length > 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>New categories created: {bulkResult.data.newCategories.join(', ')}</p>}
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Open each product to review details and upload photos — they are not visible in your store until you publish them.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name, SKU or brand..." aria-label="Search products" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
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
                        <button className="btn btn-ghost btn-icon" onClick={() => copyLink(p)} title="Copy product link" aria-label="Copy product link">{copiedId === p.id ? <Check size={14} style={{ color: 'var(--success, #4ade80)' }} /> : <Link2 size={14} />}</button>
                        <button className="btn btn-ghost btn-icon" onClick={() => duplicateProduct(p.id)} title="Duplicate" aria-label="Duplicate"><Copy size={14} /></button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id)} title="Delete" aria-label="Delete"><Trash2 size={14} /></button>
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
