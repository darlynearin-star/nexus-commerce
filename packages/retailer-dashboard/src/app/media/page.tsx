'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDismiss } from '@/lib/use-dismiss';
import { Package, Edit2, Trash2, X, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [form, setForm] = useState<any>({ name: '', sku: '', price: 0, stock: 0, status: 'DRAFT', brand: '' });
  const [saving, setSaving] = useState(false);

  const modalRef = useDismiss(modal.open, () => setModal({ open: false }));

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try { const res = await api.get('/analytics/product-stats'); setProducts(res.data || []); } catch (e: any) { console.error('Error:', e); } finally { setLoading(false); }
  };

  const openEdit = (p: any) => {
    setForm({ name: p.name, sku: p.sku, price: p.price, stock: p.stock, status: p.status, brand: p.brand || '' });
    setModal({ open: true, edit: p });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/products/${modal.edit.id}`, form);
      setModal({ open: false });
      loadProducts();
    } catch (e: any) { console.error('Save error:', e); } finally { setSaving(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} /> Products
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{products.length} products. Stats include all time</p>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <h3>No products yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Add products from the Products section to see stats here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container"><table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Cart Demand</th>
                <th style={{ textAlign: 'center' }}>Orders</th>
                <th style={{ textAlign: 'center' }}>Units Sold</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.sku} {p.brand ? `· ${p.brand}` : ''} {p.category ? `· ${p.category}` : ''}</p>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>UGX {p.price.toLocaleString()}</td>
                  <td><span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-error'}`}>{p.stock > 0 ? p.stock : 'Out'}</span></td>
                  <td><span className={`badge ${p.status === 'PUBLISHED' ? 'badge-success' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                      <ShoppingCart size={14} style={{ opacity: 0.5 }} /> {p.cartDemand}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{p.orderCount}</td>
                  <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>{p.unitsSold}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>UGX {p.revenue.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-icon" title="Edit" aria-label="Edit" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} title="Delete" aria-label="Delete" onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button>
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
          <div ref={modalRef} tabIndex={-1} style={{ background: 'var(--surface)', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600 }}>Edit Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal({ open: false })} aria-label="Close dialog"><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="productName" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Name</label>
                <input id="productName" className="input" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="productSku" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SKU</label>
                  <input id="productSku" className="input" value={form.sku} onChange={e => setForm((p: any) => ({ ...p, sku: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="productBrand" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Brand</label>
                  <input id="productBrand" className="input" value={form.brand} onChange={e => setForm((p: any) => ({ ...p, brand: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="productPrice" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Price (UGX)</label>
                  <input id="productPrice" className="input" type="number" value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label htmlFor="productStock" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Stock</label>
                  <input id="productStock" className="input" type="number" value={form.stock} onChange={e => setForm((p: any) => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label htmlFor="productStatus" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Status</label>
                <select id="productStatus" className="input" value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setModal({ open: false })}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.sku}>{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}