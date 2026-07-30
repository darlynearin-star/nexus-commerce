'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import CategoryPicker from '@/components/CategoryPicker';
import FieldInfo from '@/components/FieldInfo';

interface FlatCat { id: string; label: string; slug: string; depth: number; parentId: string | null; }
interface AttributeDef { key: string; label: string; type: 'select' | 'multiselect' | 'text' | 'boolean' | 'number'; options?: { label: string; value: string }[]; placeholder?: string; unit?: string; }
interface Variant { _key: string; name: string; sku: string; price: number; stock: number; options: { name: string; value: string }[]; image: string; }

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<FlatCat[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categoryAttrs, setCategoryAttrs] = useState<AttributeDef[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const seoTitleEdited = useRef(false);

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

  const catIdToSlug = useMemo(() => {
    const m = new Map<string, string>(); for (const c of categories) m.set(c.id, c.slug); return m;
  }, [categories]);

  useEffect(() => {
    const slug = localStorage.getItem('activeStoreSlug');
    const ensureSlug = slug ? Promise.resolve(slug) : api.get('/stores/mine').then((res: any) => {
      const s = res.data?.slug;
      if (s) localStorage.setItem('activeStoreSlug', s);
      return s;
    }).catch(() => null);
    ensureSlug.then(() => {
      api.get('/categories').then((res: any) => {
        const raw: any[] = res.data || [];
        const depthMap = new Map<string, number>();
        const computeDepth = (id: string): number => {
          if (depthMap.has(id)) return depthMap.get(id)!;
          const c = raw.find(x => x.id === id);
          if (!c || !c.parentId) { depthMap.set(id, 0); return 0; }
          const d = computeDepth(c.parentId) + 1;
          depthMap.set(id, d);
          return d;
        };
        raw.forEach(c => computeDepth(c.id));
        const cats: FlatCat[] = raw.map((c: any) => ({ id: c.id, label: c.name, slug: c.slug, depth: depthMap.get(c.id) || 0, parentId: c.parentId || null }));
        setCategories(cats);
      }).catch(() => {});
    });
  }, []);

  const update = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  const handleCategoryChange = async (catId: string) => {
    update('categoryId', catId);
    const slug = catIdToSlug.get(catId) || '';
    update('categorySlug', slug);
    setAttrValues({});
    if (slug) {
      try {
        const res = await api.get(`/categories/${slug}/attributes`);
        setCategoryAttrs(res.data || []);
      } catch { setCategoryAttrs([]); }
    } else {
      setCategoryAttrs([]);
    }
  };

  const setAttr = (key: string, value: string) => setAttrValues(p => ({ ...p, [key]: value }));

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
    if (!form.categoryId) errs.push('Category is required');
    if (!form.name.trim()) errs.push('Product name is required');
    if (!form.sku.trim()) errs.push('SKU is required');
    if (form.price <= 0) errs.push('Price must be greater than 0');
    const seenSkus = new Set<string>();
    for (const v of variants) { if (v.sku && seenSkus.has(v.sku)) errs.push(`Duplicate variant SKU: ${v.sku}`); seenSkus.add(v.sku); }
    setErrors(errs);
    return errs.length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanedFeatures = features.filter(f => f.trim());
      const cleanedSpecs: Record<string, string> = {};
      for (const s of specs) if (s.key.trim()) cleanedSpecs[s.key.trim()] = s.value.trim();
      for (const [k, v] of Object.entries(attrValues)) if (v) cleanedSpecs[k] = v;
      const cleanedVariants = variants.filter(v => v.name.trim()).map(v => { const { _key, ...rest } = v; return { ...rest, options: v.options.filter(o => o.name.trim()) }; });
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const payload = {
        ...form, slug, tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        price: parseFloat(form.price) || 0,
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        costPerItem: form.costPerItem ? parseFloat(form.costPerItem) : null,
        stock: parseInt(form.stock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
        features: cleanedFeatures,
        specifications: cleanedSpecs,
        images,
        weight: 0, weightUnit: 'kg', shippingClass: 'standard', estimatedDays: '', freeShipping: true,
      };
      delete payload.categorySlug;
      const res = await api.post('/products', payload);
      if (cleanedVariants.length > 0) await api.put(`/products/${res.data.id}/variants`, { variants: cleanedVariants });
      router.push(`/products/${res.data.id}/edit`);
    } catch (e: any) { setErrors([e.message || 'Failed to save product']); } finally { setSaving(false); }
  };

  const renderAttrField = (attr: AttributeDef) => {
    const val = attrValues[attr.key] || '';
    if (attr.type === 'select' && attr.options) {
      return (
        <select className="input" value={val} onChange={e => setAttr(attr.key, e.target.value)}>
          <option value="">Select {attr.label.toLowerCase()}...</option>
          {attr.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (attr.type === 'boolean') {
      return (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="radio" name={`attr_${attr.key}`} checked={val === 'yes'} onChange={() => setAttr(attr.key, 'yes')} /> Yes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="radio" name={`attr_${attr.key}`} checked={val === 'no'} onChange={() => setAttr(attr.key, 'no')} /> No
          </label>
        </div>
      );
    }
    if (attr.type === 'number') {
      return <input className="input" type="number" value={val} onChange={e => setAttr(attr.key, e.target.value)} placeholder={attr.placeholder} />;
    }
    return <input className="input" value={val} onChange={e => setAttr(attr.key, e.target.value)} placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}`} />;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push('/products')}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Product</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Create a new product for your store</p></div>
      </div>

      {errors.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: '#2e0505', border: '1px solid #f87171', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {errors.map((e, i) => <p key={i} style={{ color: '#f87171', fontSize: '0.8125rem' }}>{e}</p>)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section: Category + Basic Info */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Category FIRST */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Category *<FieldInfo text="Select the best category for your product. This determines the specific attributes you need to fill in below." /></label>
              <CategoryPicker categories={categories.map(c => ({ id: c.id, label: c.label, slug: c.slug, depth: c.depth, parentId: c.parentId }))} selectedId={form.categoryId} onChange={handleCategoryChange} />
            </div>

            {/* Dynamic category attributes */}
            {categoryAttrs.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: '0.5rem', padding: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Category-specific details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {categoryAttrs.map(attr => (
                    <div key={attr.key}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>{attr.label}{attr.unit ? ` (${attr.unit})` : ''}</label>
                      {renderAttrField(attr)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Product Name *<FieldInfo text="The name of your product as it appears on your storefront and in search results." /></label>
                <input className="input" value={form.name} onChange={e => { update('name', e.target.value); if (!seoTitleEdited.current) update('seoTitle', e.target.value); }} placeholder="e.g., Sterling Silver Chain Necklace" />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Brand<FieldInfo text="The brand or manufacturer of this product. Helps customers identify and search for your product." /></label>
                <input className="input" value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="Brand name" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SKU *<FieldInfo text="Stock Keeping Unit — your unique code to track this product in inventory." /></label>
                <input className="input" value={form.sku} onChange={e => update('sku', e.target.value)} placeholder="e.g., AD-JW-001" />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Status<FieldInfo text="Draft = hidden. Published = live on store. Archived = removed from view." /></label>
                <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Description<FieldInfo text="A detailed description of your product. Include materials, sizing, features — anything a customer should know before buying." /></label>
              <textarea className="input" rows={4} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Product description..." style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Section: Pricing */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Pricing</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Price (UGX) *<FieldInfo text="The selling price the customer pays. Enter in UGX." /></label>
              <input className="input" type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Compare-at Price<FieldInfo text="Original price shown with strikethrough to highlight a discount." /></label>
              <input className="input" type="number" value={form.compareAtPrice} onChange={e => update('compareAtPrice', e.target.value)} placeholder="Original price" />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Cost per Item<FieldInfo text="How much you paid for this item. Used for profit calculation. Customers don't see this." /></label>
              <input className="input" type="number" value={form.costPerItem} onChange={e => update('costPerItem', e.target.value)} placeholder="Cost" />
            </div>
          </div>
        </div>

        {/* Section: Images */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Images <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{images.length}/10</span></h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}><strong>Image 1</strong> = Main. <strong>Images 2-4</strong> = gallery. <strong>5+</strong> = hidden until tapped.</p>
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
                <Upload size={20} /> {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Section: Inventory */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Inventory</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Stock Quantity<FieldInfo text="How many units available to sell." /></label><input className="input" type="number" value={form.stock} onChange={e => update('stock', e.target.value)} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Low Stock Threshold<FieldInfo text="Alert when stock drops to this number." /></label><input className="input" type="number" value={form.lowStockThreshold} onChange={e => update('lowStockThreshold', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.trackInventory} onChange={e => update('trackInventory', e.target.checked)} /> Track Inventory</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.allowBackorder} onChange={e => update('allowBackorder', e.target.checked)} /> Allow Backorders</label>
          </div>
        </div>

        {/* Section: Features */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Features</h3>
            <button className="btn btn-ghost btn-sm" onClick={addFeature}><Plus size={14} /> Add Feature</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{i + 1}.</span>
                <input className="input" value={f} onChange={e => setFeature(i, e.target.value)} placeholder="e.g., Polished 925 sterling silver" style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-icon" onClick={() => removeFeature(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Specifications */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Additional Specifications</h3>
            <button className="btn btn-ghost btn-sm" onClick={addSpec}><Plus size={14} /> Add</button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Any other specs not covered by the category-specific fields above.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input className="input" value={s.key} onChange={e => setSpec(i, 'key', e.target.value)} placeholder="Label (e.g., Material)" style={{ width: 200 }} />
                <input className="input" value={s.value} onChange={e => setSpec(i, 'value', e.target.value)} placeholder="Value" style={{ flex: 1 }} />
                <button className="btn btn-ghost btn-icon" onClick={() => removeSpec(i)}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Variants */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Variants <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>({variants.length})</span></h3>
            <button className="btn btn-ghost btn-sm" onClick={addVariant}><Plus size={14} /> Add Variant</button>
          </div>
          {variants.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No variants yet. Add variants for different options like size, color, or material.</p>
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
                        <input className="input" value={o.name} onChange={e => setVariantOption(v._key, oi, 'name', e.target.value)} placeholder="Name (e.g., Color)" style={{ width: 150, fontSize: '0.75rem' }} />
                        <input className="input" value={o.value} onChange={e => setVariantOption(v._key, oi, 'value', e.target.value)} placeholder="Value (e.g., Red)" style={{ width: 150, fontSize: '0.75rem' }} />
                        <button className="btn btn-ghost btn-icon" onClick={() => removeVariantOption(v._key, oi)}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: SEO */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>SEO</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SEO Title<FieldInfo text="Title shown in search results. If empty, product name is used." /></label><input className="input" value={form.seoTitle} onChange={e => { seoTitleEdited.current = true; update('seoTitle', e.target.value); }} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>SEO Description<FieldInfo text="Short description shown below the title in search results." /></label><textarea className="input" rows={2} value={form.seoDescription} onChange={e => update('seoDescription', e.target.value)} /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Tags (comma separated)<FieldInfo text="Keywords that help customers find your product." /></label><input className="input" value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g., necklace, silver, jewelry" /></div>
          </div>
        </div>

        {/* Section: Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Additional Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Return Policy<FieldInfo text="Your return policy for this product." /></label><input className="input" value={form.returnPolicy} onChange={e => update('returnPolicy', e.target.value)} placeholder="e.g., 30-day returns" /></div>
            <div><label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Warranty<FieldInfo text="Warranty information for this product." /></label><input className="input" value={form.warranty} onChange={e => update('warranty', e.target.value)} placeholder="e.g., 1-year warranty" /></div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.isFeatured} onChange={e => update('isFeatured', e.target.checked)} /> Featured</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}><input type="checkbox" checked={form.isNew} onChange={e => update('isNew', e.target.checked)} /> New Arrival</label>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/products')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Product'}</button>
        </div>
      </div>
    </div>
  );
}
