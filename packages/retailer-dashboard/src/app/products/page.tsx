'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Copy, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try { const res = await api.get('/products', { limit: 50, status: undefined }); setProducts(res.data); } catch {} finally { setLoading(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  const duplicateProduct = async (id: string) => {
    await api.post(`/products/${id}/duplicate`);
    loadProducts();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Products</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{products.length} products</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm">Import CSV</button>
          <button className="btn btn-primary btn-sm"><Plus size={16} /> Add Product</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-icon"><Filter size={18} /></button>
      </div>
      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
            </thead>
            <tbody>
              {products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '0.375rem', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📦</div>
                      <div><p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.brand}</p></div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{p.sku}</td>
                  <td style={{ fontWeight: 600 }}>${p.price.toFixed(2)}</td>
                  <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-error'}`}>{p.stock > 0 ? p.stock : 'Out'}</span></td>
                  <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-success' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-icon"><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-icon" onClick={() => duplicateProduct(p.id)}><Copy size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}