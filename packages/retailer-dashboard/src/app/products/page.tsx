'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Copy, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { limit: 100, status: statusFilter || undefined });
      setProducts(res.data);
    } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, [statusFilter]);

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  const duplicateProduct = async (id: string) => {
    await api.post(`/products/${id}/duplicate`);
    loadProducts();
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{products.length} products</p></div>
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
        <div className="card"><div className="skeleton" style={{ height: 400 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No products found</p>
          <Link href="/products/new" className="btn btn-primary btn-sm"><Plus size={16} /> Add your first product</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container"><table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th style={{ width: 140 }}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/products/${p.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '0.375rem', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📦</div>
                      <div><p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.brand}</p></div>
                    </Link>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{p.sku}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{p.category?.name || '-'}</td>
                  <td style={{ fontWeight: 600 }}>UGX {p.price?.toLocaleString()}</td>
                  <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-error'}`}>{p.stock > 0 ? p.stock : 'Out'}</span></td>
                  <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-success' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <Link href={`/products/${p.id}/edit`} className="btn btn-ghost btn-icon"><Edit2 size={14} /></Link>
                      <button className="btn btn-ghost btn-icon" onClick={() => duplicateProduct(p.id)}><Copy size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
