'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import CategoryPicker from '@/components/CategoryPicker';
import FieldInfo from '@/components/FieldInfo';

interface Category { id: string; name: string; slug: string; parentId: string | null; children?: Category[]; }
interface Variant { _key: string; name: string; sku: string; price: number; stock: number; options: { name: string; value: string }[]; image: string; }

function buildTree(cats: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];
  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(node);
    else roots.push(node);
  });
  return roots;
}

interface FlatCat { id: string; label: string; slug: string; depth: number; parentId: string | null; }

function flattenTree(nodes: Category[], depth = 0, parentId: string | null = null): FlatCat[] {
  const result: FlatCat[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, label: n.name, slug: n.slug || '', depth, parentId });
    if (n.children) result.push(...flattenTree(n.children, depth + 1, n.id));
  }
  return result;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FlatCat[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [shortCode, setShortCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<any>({
    name: '', brand: '', sku: '', description: '', price: 0, compareAtPrice: '', costPerItem: '',
    stock: 0, lowStockThreshold: 10, trackInventory: true, allowBackorder: false,
    categoryId: '', categorySlug: '', status: 'DRAFT', tags: '',
    isFeatured: false, isNew: false,
    seoTitle: '', seoDescription: '', returnPolicy: '', warranty: '',
  });

  const [features, setFeatures] = useState<string[]>(['']);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [variants, setVariants] = useState<Variant[]>([]);


  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    const slug = localStorage.getItem('activeStoreSlug');
    const ensureSlug = slug ? Promise.resolve(slug) : api.get('/stores/mine').then((res: any) => {
      const s = res.data?.slug;
      if (s) localStorage.setItem('activeStoreSlug', s);
      return s;
    }).catch(() => null);
    ensureSlug.then(() => Promise.all([
      api.get('/categories'),
      api.get(`/products/detail/${id}`),
    ])).then(([catRes, prodRes]: any[]) => {
      const flatCats = flattenTree(buildTree(catRes.data || []));
      setCategories(flatCats);
      const p = prodRes.data;
      const initialCat = flatCats.find(c => c.id === p.categoryId);
      setShortCode(p.shortCode || '');
      setStoreSlug(p.store?.slug || localStorage.getItem('activeStoreSlug') || '');
      setForm({
        name: p.name || '', brand: p.brand || '', sku: p.sku || '', slug: p.slug || '', description: p.description || '',
        price: p.price || 0, compareAtPrice: p.compareAtPrice || '', costPerItem: p.costPerItem || '',
        stock: p.stock || 0, lowStockThreshold: p.lowStockThreshold ?? 10,
        trackInventory: p.trackInventory ?? true, allowBackorder: p.allowBackorder ?? false,
        categoryId: p.categoryId || '', status: p.status || 'DRAFT',
        tags: (p.tags || []).join(', '),
        isFeatured: p.isFeatured || false, isNew: p.isNew || false,
        seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '',
        returnPolicy: p.returnPolicy || '', warranty: p.warranty || '',
      });
      setFeatures(p.features?.length ? p.features : ['']);
      const specEntries = p.specifications ? Object.entries(p.specifications) : [];
      setSpecs(specEntries.length ? specEntries.map(([k, v]: [string, any]) => ({ key: k, value: String(v) })) : [{ key: '', value: '' }]);
      setVariants((p.variants || []).map((v: any) => ({ ...v, _key: v.id || Math.random().toString(36).slice(2) })));
      setLoading(false);
    }).catch(() => { setLoading(false); setErrors(['Failed to load product']); });
  }, [params?.id]);

  const update = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  const addFeature = () => setFeatures(p => [...p, '']);
  const removeFeature = (i: number) => setFeatures(p => p.filter((_, idx) => idx !== i));
  const setFeature = (i: number, v: string) => setFeatures(p => p.map((f, idx) => idx === i ? v : f));

  const addSpec = () => setSpecs(p => [...p, { key: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(p => p.filter((_, idx) => idx !== i));
  const setSpec = (i: number, field: 'key' | 'value', v: string) => setSpecs(p => p.map((s, idx) => idx === i ? { ...s, [field]: v } : s));

  const addVariant = () => setVariants(p => [...p, { _key: Math.random().toString(36).slice(2), name: '', sku: '', price: form.price || 0, stock: 0, options: [], image: '' }]);
  const removeVariant = (key: string) => setVariants(p => p.filter(v => v._key !== key));
  const setVariant = (key: string, field: string, value: any) => setVariants(p => p.map(v => v._key === key ? { ...v, [field]: value } : v));
  const addVariantOption = (vKey: string) => setVariants(p => p.map(v => v._key === vKey ? { ...v, options: [...v.options, { name: '', value: '' }] } : v));
  const removeVariantOption = (vKey: string, oIdx: number) => setVariants(p => p.map(v => v._key === vKey ? { ...v, options: v.options.filter((_, i) => i !== oIdx) } : v));
  const setVariantOption = (vKey: string, oIdx: number, field: string, value: string) => setVariants(p => p.map(v => v._key === vKey ? { ...v, options: v.options.map((o, i) => i === oIdx ? { ...o, [field]: value } : o) } : v));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 10) { setErrors(['Maximum 10 images allowed']); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors(['File too large — max 5MB']); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await api.upload('/upload', formData);
      setImages(p => [...p, data.data.url]);
    } catch (e: any) { setErrors([e.message || 'Upload failed']); } finally { setUploading(false); }
  };

  const removeImage = (url: string) => setImages(p => p.filter(i => i !== url));

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Product name is required');
    if (!form.sku.trim()) errs.push('SKU is required');
    if (!form.categoryId) errs.push('Category is required');
    if (form.price <= 0) errs.push('Price must be greater than 0');
    setErrors(errs);
    return errs.length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanedFeatures = features.filter(f => f.trim());
      const cleanedSpecs: Record<string, string> = {};
      specs.filter(s => s.key.trim()).forEach(s => { cleanedSpecs[s.key.trim()] = s.value.trim(); });
      const cleanedVariants = variants.filter(v => v.name.trim()).map(v => {
        const { _key, ...rest } = v;
        return { ...rest, options: v.options.filter(o => o.name.trim()) };
      });
      const id = params?.id as string;
      const payload = {
        ...form, tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        price: parseFloat(form.price) || 0,
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        costPerItem: form.costPerItem ? parseFloat(form.costPerItem) : null,
        stock: parseInt(form.stock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
        features: cleanedFeatures, specifications: cleanedSpecs,
        weight: 0, weightUnit: 'kg', shippingClass: 'standard', estimatedDays: '', freeShipping: true,
      };
      await api.put(`/products/${id}`, { ...payload, images });
      await api.put(`/products/${id}/variants`, { variants: cleanedVariants });
      router.push('/products');
    } catch (e: any) { setErrors([e.message || 'Failed to save product']); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: '2rem' }}><div className="skeleton" style={{ height: 400 }} /></div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push('/products')}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Product</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{form.name}</p></div>
      </div>

      {errors.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#2e0505', border: '1px solid #f87171', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {errors.map((e, i) => <p key={i} style={{ color: '#f87171', fontSize: '0.8125rem' }}>{e}</p>)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Share Link */}
        {shortCode && (
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Share Link</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Share this link anywhere — WhatsApp, SMS, social media — and it sends customers straight to this product.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="input"
                readOnly
                value={`https://nexus-storefront-dusky.vercel.app/store/${storeSlug}/product/${form.slug}`}
                style={{ flex: 1, fontSize: '0.8125rem', userSelect: 'all' }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button className="btn btn-secondary" onClick={() => {
                navigator.clipboard.writeText(`https://nexus-storefront-dusky.vercel.app/store/${storeSlug}/product/${form.slug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Product Name *<FieldInfo text="The name of your product as it appears on your storefront and in search results." /></label>
              <input className="input" value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Brand<FieldInfo text="The brand or manufacturer of this product (e.g., Samsung, Gucci, Toyota)." /></label>
                <input className="input" value={form.brand} onChange={e => update('brand', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SKU *<FieldInfo text="Stock Keeping Unit — your unique code to track this product in inventory." /></label>
                <input className="input" value={form.sku} onChange={e => update('sku', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Category *<FieldInfo text="The category helps customers find your product when browsing your store." /></label>
              <CategoryPicker categories={categories} selectedId={form.categoryId} onChange={id => { update('categoryId', id); const slug = categories.find(c => c.id === id)?.slug || ''; update('categorySlug', slug); }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Description<FieldInfo text="A detailed description of your product. Include materials, sizing, features." /></label>
              <textarea className="input" rows={4} value={form.description} onChange={e => update('description', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Pricing</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Price (UGX) *<FieldInfo text="The selling price the customer pays. Enter in UGX." /></label>
              <input className="input" type="number" value={form.price} onChange={e => update('price', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Compare-at Price<FieldInfo text="The original price shown with a strikethrough to highlight a discount. Leave empty if not on sale." /></label>
              <input className="input" type="number" value={form.compareAtPrice} onChange={e => update('compareAtPrice', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Cost per Item<FieldInfo text="How much you paid to make or buy this item. Used to calculate profit. Customers don't see this." /></label>
              <input className="input" type="number" value={form.costPerItem} onChange={e => update('costPerItem', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Images <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{images.length}/10</span></h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            <strong>Image 1</strong> = Main/featured image on storefront. <strong>Images 2-4</strong> = shown in product gallery. <strong>Images 5+</strong> = hidden until tapped. JPG/PNG/WebP only.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {images.map((url, i) => (
              <div key={i} style={{ width: 100, height: 130, borderRadius: '0.5rem', overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
                <img src={url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style=\"padding:1rem;text-align:center;color:var(--error);font-size:0.75rem\">Broken</div>'; }} />
                <div style={{ fontSize: '0.625rem', textAlign: 'center', padding: '0.125rem 0', color: 'var(--text-secondary)' }}>{i === 0 ? 'Main' : `Image ${i + 1}`}</div>
                <button style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }} onClick={() => removeImage(url)}><X size={12} /></button>
              </div>
            ))}
            {images.length < 10 && (
              <label style={{ width: 100, height: 100, borderRadius: '0.5rem', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.75rem', gap: '0.25rem' }}>
                <Upload size={20} />{uploading ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Inventory</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Stock Quantity<FieldInfo text="How many units you have available to sell." /></label><input className="input" type="number" value={form.stock} onChange={e => update('stock', e.target.value)} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Low Stock Threshold<FieldInfo text="When stock drops to this number you'll be alerted to restock." /></label><input className="input" type="number" value={form.lowStockThreshold} onChange={e => update('lowStockThreshold', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.trackInventory} onChange={e => update('trackInventory', e.target.checked)} /> Track Inventory</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.allowBackorder} onChange={e => update('allowBackorder', e.target.checked)} /> Allow Backorders</label>
          </div>
        </div>

        {/* Features */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Features</h3>
            <button className="btn btn-ghost btn-sm" onClick={addFeature}><Plus size={14} /> Add Feature</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{i + 1}.</span>
                <input className="input" value={f} onChange={e => setFeature(i, e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-icon" onClick={() => removeFeature(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Specifications */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Specifications</h3>
            <button className="btn btn-ghost btn-sm" onClick={addSpec}><Plus size={14} /> Add Specification</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input className="input" value={s.key} onChange={e => setSpec(i, 'key', e.target.value)} placeholder="Label" style={{ width: 200 }} />
                <input className="input" value={s.value} onChange={e => setSpec(i, 'value', e.target.value)} placeholder="Value" style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-icon" onClick={() => removeSpec(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Variants */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Variants <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>({variants.length})</span></h3>
            <button className="btn btn-ghost btn-sm" onClick={addVariant}><Plus size={14} /> Add Variant</button>
          </div>
          {variants.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No variants.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {variants.map((v) => (
                <div key={v._key} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{v.name || 'New Variant'}</span>
                    <button className="btn btn-ghost btn-icon" style={{ color: 'var(--error)' }} onClick={() => removeVariant(v._key)}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input className="input" value={v.name} onChange={e => setVariant(v._key, 'name', e.target.value)} placeholder="Name" style={{ fontSize: '0.8125rem' }} />
                    <input className="input" value={v.sku} onChange={e => setVariant(v._key, 'sku', e.target.value)} placeholder="SKU" style={{ fontSize: '0.8125rem' }} />
                    <input className="input" type="number" value={v.price} onChange={e => setVariant(v._key, 'price', parseFloat(e.target.value) || 0)} placeholder="Price" style={{ fontSize: '0.8125rem' }} />
                    <input className="input" type="number" value={v.stock} onChange={e => setVariant(v._key, 'stock', parseInt(e.target.value) || 0)} placeholder="Stock" style={{ fontSize: '0.8125rem' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Options:</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => addVariantOption(v._key)} style={{ fontSize: '0.75rem' }}><Plus size={12} /> Add</button>
                    </div>
                    {v.options.map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                        <input className="input" value={o.name} onChange={e => setVariantOption(v._key, oi, 'name', e.target.value)} placeholder="Option name" style={{ width: 150, fontSize: '0.75rem' }} />
                        <input className="input" value={o.value} onChange={e => setVariantOption(v._key, oi, 'value', e.target.value)} placeholder="Value" style={{ width: 150, fontSize: '0.75rem' }} />
                        <button className="btn btn-ghost btn-icon" onClick={() => removeVariantOption(v._key, oi)}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>SEO</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SEO Title<FieldInfo text="The title shown in Google search results. If left empty the product name is used." /></label><input className="input" value={form.seoTitle} onChange={e => update('seoTitle', e.target.value)} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SEO Description<FieldInfo text="A short description shown below the title in search results." /></label><textarea className="input" rows={2} value={form.seoDescription} onChange={e => update('seoDescription', e.target.value)} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Tags (comma separated)<FieldInfo text="Keywords that help customers find your product when searching." /></label><input className="input" value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g., necklace, silver, jewelry" /></div>
          </div>
        </div>

        {/* Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Status<FieldInfo text="Draft = hidden, Published = live on store, Archived = removed from view." /></label>
                <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Return Policy<FieldInfo text="Your return policy for this product (e.g., '30-day returns')." /></label><input className="input" value={form.returnPolicy} onChange={e => update('returnPolicy', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Warranty<FieldInfo text="Warranty information (e.g., '1-year manufacturer warranty')." /></label><input className="input" value={form.warranty} onChange={e => update('warranty', e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.isFeatured} onChange={e => update('isFeatured', e.target.checked)} /> Featured</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.isNew} onChange={e => update('isNew', e.target.checked)} /> New Arrival</label>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/products')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
