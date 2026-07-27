'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Copy, Search, X } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [form, setForm] = useState<any>({ name: '', sku: '', price: 0, stock: 0, status: 'DRAFT', categoryId: '', brand: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); loadCategories(); }, []);

  const loadProducts = async () => {
    try { const res = await api.get('/products', { limit: 50, status: undefined }); setProducts(res.data); } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try { const res = await api.get('/categories'); setCategories(res.data || []); } catch (e: any) { console.error('Error loading categories:', e); }
  };

  const openAdd = () => {
    setForm({ name: '', sku: '', price: 0, stock: 0, status: 'DRAFT', categoryId: categories[0]?.id || '', brand: '' });
    setModal({ open: true });
  };

  const openEdit = (p: any) => {
    setForm({ name: p.name, sku: p.sku, price: p.price, stock: p.stock, status: p.status, categoryId: p.categoryId, brand: p.brand || '' });
    setModal({ open: true, edit: p });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.edit) {
        await api.put(`/products/${modal.edit.id}`, form);
      } else {
        await api.post('/products', { ...form, slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
      }
      setModal({ open: false });
      loadProducts();
    } catch (e: any) { console.error('Save error:', e); } finally { setSaving(false); }
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
        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container"><table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th style={{ width: 140 }}>Actions</th></tr>
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
                  <td style={{ fontWeight: 600 }}>UGX {p.price.toLocaleString()}</td>
                  <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-error'}`}>{p.stock > 0 ? p.stock : 'Out'}</span></td>
                  <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-success' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
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

      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setModal({ open: false })}>
          <div style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600 }}>{modal.edit ? 'Edit Product' : 'Add Product'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal({ open: false })}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Name</label>
                <input className="input" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SKU</label>
                  <input className="input" value={form.sku} onChange={e => setForm((p: any) => ({ ...p, sku: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Brand</label>
                  <input className="input" value={form.brand} onChange={e => setForm((p: any) => ({ ...p, brand: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Price (UGX)</label>
                  <input className="input" type="number" value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Stock</label>
                  <input className="input" type="number" value={form.stock} onChange={e => setForm((p: any) => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Category</label>
                <select className="input" value={form.categoryId} onChange={e => setForm((p: any) => ({ ...p, categoryId: e.target.value }))}>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setModal({ open: false })}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.sku}>{saving ? 'Saving...' : modal.edit ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}