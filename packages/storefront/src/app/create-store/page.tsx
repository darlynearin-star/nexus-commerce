'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setStoreSlug } from '@/lib/store-api';
import {
  BUILT_IN_TEMPLATES, DEFAULT_TEMPLATE_ID, THEME_COLOR_KEYS,
  applyThemeColors, snapshotSiteTheme, restoreSiteTheme, resolveThemeMode,
  normalizeHex, withColorDefaults,
  type StoreThemeTemplate, type ThemeColors,
} from '@nexus/shared';
import { ArrowRight, Check, X, Store, Palette, CreditCard, Shield, Gem, Smartphone, ChevronRight, Phone, MessageCircle, Mail } from 'lucide-react';

const COLOR_LABELS: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  bg: 'Background',
  surface: 'Surface',
  text: 'Text',
  accent: 'Accent',
};

const COLOR_HINTS: Record<string, string> = {
  primary: 'Buttons, links and highlights',
  secondary: 'Hover and pressed button states',
  bg: 'Page background. This also decides light or dark mode.',
  surface: 'Cards and panels',
  text: 'Body text',
  accent: 'Subtle highlights and gradients',
};

const slides = [
  {
    icon: <Store size={48} />,
    title: 'Sell Online in Minutes',
    desc: 'Create a personalized storefront for your brand in minutes. No coding, no hassle. Just pick a design, add your products, and start selling across Uganda.',
    feat: ['4 professional templates', 'Custom branding & colors', 'Your own store URL'],
  },
  {
    icon: <Palette size={48} />,
    title: 'Pick Your Style',
    desc: 'Choose from four designer-crafted templates: Elegance (gold & dark), Minimal (clean & modern), Bold (vibrant & energetic), or Nature (organic & fresh). Every color is customizable.',
    feat: ['Live preview as you customise', 'Automatic dark & light mode', 'Mobile-friendly design'],
  },
  {
    icon: <Smartphone size={48} />,
    title: 'Accept UGX Payments Instantly',
    desc: 'Your customers can pay with MTN Mobile Money and Airtel Money from day one. Everything in Uganda Shillings: local shipping, local rates, local payments.',
    feat: ['MTN MoMo & Airtel Money', 'Flutterwave card payments', '14-day free trial, then 3,000 UGX/week'],
  },
];

export default function CreateStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [templates, setTemplates] = useState<StoreThemeTemplate[]>(BUILT_IN_TEMPLATES);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [colors, setColors] = useState<ThemeColors>(withColorDefaults(BUILT_IN_TEMPLATES[0].defaultColors));
  // Free-text hex entry, kept separately so a half-typed value like "#D4A"
  // does not fight the picker or get normalised out from under the user.
  const [hexDrafts, setHexDrafts] = useState<Partial<Record<string, string>>>({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const template = useMemo(
    () => templates.find(t => t.id === templateId) || templates[0] || BUILT_IN_TEMPLATES[0],
    [templates, templateId]
  );

  const themeMode = useMemo(() => resolveThemeMode(colors), [colors]);

  // Templates are admin-editable via /api/templates, with the built-in set as
  // an offline fallback so the wizard never renders an empty gallery.
  useEffect(() => {
    let cancelled = false;
    api.get<any>('/templates')
      .then((r: any) => {
        const list = Array.isArray(r?.data) ? r.data : [];
        if (cancelled || !list.length) return;
        const clean: StoreThemeTemplate[] = list.map((t: any) => ({
          id: String(t.id),
          name: String(t.name || t.id),
          description: String(t.description || ''),
          defaultColors: withColorDefaults(t.defaultColors),
        }));
        setTemplates(clean);
        setTemplateId(prev => (clean.some(t => t.id === prev) ? prev : clean[0].id));
      })
      .catch(() => { /* keep built-ins */ });
    return () => { cancelled = true; };
  }, []);

  // Live preview. This deliberately repaints the whole page while the wizard is
  // open so the operator sees real colours, then restoreSiteTheme puts the
  // platform theme back on unmount. Previously nothing was restored, so
  // visiting this page left the entire site repainted.
  const previewSnapshot = useRef<ReturnType<typeof snapshotSiteTheme> | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!previewSnapshot.current) previewSnapshot.current = snapshotSiteTheme(root);
    root.setAttribute('data-theme', themeMode);
    applyThemeColors(colors, root);
    return () => {
      if (previewSnapshot.current) {
        restoreSiteTheme(previewSnapshot.current, root);
        previewSnapshot.current = null;
      }
    };
  }, [colors, themeMode]);

  const pickTemplate = useCallback((t: StoreThemeTemplate) => {
    setTemplateId(t.id);
    setColors(withColorDefaults(t.defaultColors));
    setHexDrafts({});
  }, []);

  const setColor = useCallback((key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  }, []);

  // Only accept a well-formed hex; otherwise keep the last good colour so the
  // live preview and the saved theme never receive junk.
  const commitHex = useCallback((key: keyof ThemeColors, raw: string) => {
    setHexDrafts(prev => ({ ...prev, [key]: raw }));
    const norm = normalizeHex(raw);
    if (norm) setColor(key, norm);
  }, [setColor]);

  const invalidHexKeys = useMemo(
    () => THEME_COLOR_KEYS.filter(k => {
      const draft = hexDrafts[k];
      return draft !== undefined && draft.trim() !== '' && !normalizeHex(draft);
    }),
    [hexDrafts]
  );

  useEffect(() => {
    if (slug.length >= 3) {
      const timer = setTimeout(() => {
        api.get(`/stores/check-slug/${slug}`).then((r: any) => setSlugAvailable(r.data.available));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [slug]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/stores', {
        name,
        slug,
        template: template.id,
        colors: withColorDefaults(colors),
        logoUrl: logoUrl || undefined,
        phone,
        whatsapp,
      });
      if (res.success) {
        localStorage.setItem('activeStoreSlug', slug);
        setStoreSlug(slug);
        const token = localStorage.getItem('accessToken') || '';
        window.location.href = (process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app') + '/dashboard#token=' + encodeURIComponent(token);
        return;
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  }

  // Onboarding slides
  if (step === 0) {
    const slide = slides[slideIdx];
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 1rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ color: 'var(--primary)', marginBottom: '2rem' }}>{slide.icon}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>{slide.title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>{slide.desc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left', maxWidth: 400, margin: '0 auto 2rem' }}>
          {slide.feat.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Check size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9375rem' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Slide indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {slides.map((_, i) => (
            <div key={i} style={{ width: slideIdx === i ? 24 : 8, height: 8, borderRadius: 4, background: slideIdx === i ? 'var(--primary)' : 'var(--border)', transition: 'all 0.2s' }} />
          ))}
        </div>

        {slideIdx < slides.length - 1 ? (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }} onClick={() => setSlideIdx(slideIdx + 1)}>
            Next <ChevronRight size={20} />
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem' }}>
              <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: '0.125rem' }} />
              <label htmlFor="terms" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I agree to the <Link href="/terms" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</Link>. I understand that after a 14-day free trial, the subscription costs 3,000 UGX per week and can be cancelled anytime.
              </label>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }} disabled={!acceptedTerms} onClick={() => { setStep(1); setSlideIdx(0); }}>
              Accept & Continue <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem', position: 'relative', zIndex: 1 }}>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem', justifyContent: 'center' }}>
        {[{ n: 1, label: 'Template' }, { n: 2, label: 'Colors' }, { n: 3, label: 'Details' }].map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', background: step >= s.n ? 'var(--primary)' : 'var(--bg-secondary)', color: step >= s.n ? 'var(--bg)' : 'var(--text-secondary)', border: step >= s.n ? 'none' : '1px solid var(--border)' }}>
              {step > s.n ? <Check size={16} /> : s.n}
            </div>
            <span style={{ fontSize: '0.8125rem', color: step >= s.n ? 'var(--text)' : 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Pick Template */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Choose a template</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Pick a starting design. You can customise every colour in the next step.</p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {templates.map(t => {
              const c = withColorDefaults(t.defaultColors);
              const selected = template.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  aria-pressed={selected}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: '0.75rem', border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  {/* Miniature storefront: header bar, hero block and two cards,
                      painted with the template's own palette. */}
                  <div aria-hidden="true" style={{ width: 108, height: 68, borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0, background: c.bg, border: `1px solid ${c.surface}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 12, background: c.surface, display: 'flex', alignItems: 'center', padding: '0 4px', gap: 3 }}>
                      <div style={{ width: 14, height: 4, borderRadius: 2, background: c.primary }} />
                      <div style={{ width: 8, height: 4, borderRadius: 2, background: c.text, opacity: 0.35 }} />
                    </div>
                    <div style={{ flex: 1, padding: 4, display: 'flex', gap: 3 }}>
                      <div style={{ flex: 1, borderRadius: 3, background: c.surface, borderLeft: `2px solid ${c.accent}` }} />
                      <div style={{ width: 26, borderRadius: 3, background: c.primary }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: '0.4rem' }}>
                      {THEME_COLOR_KEYS.map(k => (
                        <span key={k} title={`${COLOR_LABELS[k]} ${c[k]}`} style={{ width: 14, height: 14, borderRadius: 4, background: c[k], border: '1px solid rgba(128,128,128,0.35)' }} />
                      ))}
                    </div>
                  </div>
                  {selected && <Check size={20} style={{ color: 'var(--primary)', marginLeft: 'auto', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
        </div>
      )}

      {/* Step 2: Customize Colors */}
      {step === 2 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Customise colours</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            The page behind this panel updates live as you type. Your background colour decides whether the store is dark or light.
          </p>

          {invalidHexKeys.length > 0 && (
            <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: 'rgba(196,78,78,0.12)', border: '1px solid var(--error)', color: 'var(--error)', fontSize: '0.8125rem' }}>
              Not a valid hex colour: {invalidHexKeys.map(k => COLOR_LABELS[k] || k).join(', ')}. Use 3 or 6 hex digits, e.g. #D4A843.
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {THEME_COLOR_KEYS.map(key => {
              const val = colors[key];
              const draft = hexDrafts[key] ?? val;
              const invalid = draft.trim() !== '' && !normalizeHex(draft);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label htmlFor={`color-${key}`} style={{ width: 92, flexShrink: 0, fontSize: '0.875rem', fontWeight: 500 }}>
                    {COLOR_LABELS[key] || key}
                  </label>
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={val}
                    onChange={e => { setColor(key, e.target.value); setHexDrafts(p => ({ ...p, [key]: e.target.value })); }}
                    style={{ width: 46, height: 38, padding: 0, border: `1px solid ${invalid ? 'var(--error)' : 'var(--border)'}`, borderRadius: '0.4rem', cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                  />
                  <input
                    aria-label={`${COLOR_LABELS[key] || key} hex value`}
                    type="text"
                    value={draft}
                    spellCheck={false}
                    onChange={e => commitHex(key, e.target.value)}
                    onBlur={() => setHexDrafts(p => ({ ...p, [key]: undefined }))}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem', borderColor: invalid ? 'var(--error)' : undefined }}
                    className="input"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flex: 2, minWidth: 0, display: 'none' }}>{COLOR_HINTS[key]}</span>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Mode: <strong style={{ color: 'var(--text)' }}>{themeMode === 'dark' ? 'Dark' : 'Light'}</strong> (from your background colour)
          </p>

          {/* Real store preview: a miniature storefront painted with the exact
              colours that will be saved. This is what the marketing copy
              promises - it did not exist before. */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Preview</p>
            <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ height: 30, background: colors.surface, display: 'flex', alignItems: 'center', padding: '0 0.75rem', gap: '0.75rem' }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: colors.primary }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.text }}>{name || 'Your Store'}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: colors.text, opacity: 0.7 }}>Shop&nbsp;&nbsp;About</span>
              </div>
              <div style={{ background: colors.bg, padding: '1.25rem' }}>
                <div style={{ height: 8, width: '45%', borderRadius: 4, background: colors.text, opacity: 0.85, marginBottom: '0.5rem' }} />
                <div style={{ height: 6, width: '65%', borderRadius: 3, background: colors.text, opacity: 0.4, marginBottom: '0.875rem' }} />
                <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: colors.bg, background: colors.primary, padding: '0.35rem 0.875rem', borderRadius: 999 }}>Shop now</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.875rem' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ background: colors.surface, borderRadius: 6, padding: '0.5rem', borderLeft: `2px solid ${i === 1 ? colors.accent : 'transparent'}` }}>
                      <div style={{ height: 5, width: '70%', borderRadius: 3, background: colors.text, opacity: 0.5, marginBottom: 4 }} />
                      <div style={{ height: 5, width: '40%', borderRadius: 3, background: colors.primary }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={invalidHexKeys.length > 0} onClick={() => setStep(3)}>Next: Details <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 3: Name & Slug */}
      {step === 3 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Store details</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="storeName" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store Name</label>
            <input id="storeName" className="input" value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="My Store" />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="storeSlug" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>/store/</span>
              <input id="storeSlug" className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))} placeholder="my-store" />
            </div>
            {slug.length >= 3 && (
              <span style={{ fontSize: '0.8125rem', color: slugAvailable ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                {slugAvailable ? <><Check size={13} /> Available</> : <><X size={13} /> Already taken</>}
              </span>
            )}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="storeLogo" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store Logo (optional)</label>
            <input id="storeLogo" className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Upload a rectangular logo image or leave empty to use your store name as text.
            </span>
            {logoUrl && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image src={logoUrl} alt="Logo preview" width={250} height={50} style={{ maxHeight: 50, maxWidth: 250, objectFit: 'contain', height: 'auto' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="storePhone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Phone Number</label>
            <input id="storePhone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="2567XXXXXXXX" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Customers will see this to confirm deliveries.
            </span>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="storeWhatsapp" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>WhatsApp Number</label>
            <input id="storeWhatsapp" className="input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="2567XXXXXXXX" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Used for WhatsApp order notifications (optional).
            </span>
          </div>
          {error && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--error)', marginBottom: '0.75rem' }}>{error}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {error.includes('store reservation') ? (
                  <>
                    <a href="tel:+256740157510" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><Phone size={14} /> Call</a>
                    <a href="https://wa.me/256740157510" target="_blank" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><MessageCircle size={14} /> WhatsApp</a>
                    <a href="mailto:lyn.nyx.store@gmail.com" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><Mail size={14} /> Email</a>
                  </>
                ) : (
                  <a href="mailto:lyn.nyx.store@gmail.com" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><Mail size={14} /> Email Mr.Dev</a>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!name || !slug || !slugAvailable || submitting} onClick={handleSubmit}>
              {submitting ? 'Creating...' : 'Launch Store'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
