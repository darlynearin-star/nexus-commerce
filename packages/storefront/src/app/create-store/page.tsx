'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setStoreSlug } from '@/lib/store-api';
import { ArrowRight, Check, Store, Palette, CreditCard, Shield, Gem, Smartphone, ChevronRight } from 'lucide-react';

const TEMPLATES = [
  { id: 'elegance', name: 'Elegance', desc: 'Gold accents on dark — timeless luxury', colors: { primary: '#D4A843', secondary: '#A8822E', bg: '#0A0A0A', surface: '#141414', text: '#FAFAFA', accent: '#F0D48A' } },
  { id: 'minimal', name: 'Minimal', desc: 'Clean whites, soft grays — modern simplicity', colors: { primary: '#2D2D2D', secondary: '#6B6B6B', bg: '#FFFFFF', surface: '#F8F8F6', text: '#1A1A1A', accent: '#B8B8B8' } },
  { id: 'bold', name: 'Bold', desc: 'High contrast red on dark — energetic edge', colors: { primary: '#FF4433', secondary: '#CC3322', bg: '#0A0A0A', surface: '#1A1A1A', text: '#FAFAFA', accent: '#FF6655' } },
  { id: 'nature', name: 'Nature', desc: 'Earthy greens, warm browns — organic feel', colors: { primary: '#5B8C5A', secondary: '#4A7349', bg: '#F8F6F0', surface: '#F0EDE4', text: '#2C2C2C', accent: '#7DAD7C' } },
];

const slides = [
  {
    icon: <Store size={48} />,
    title: 'Sell Your Fashion Online',
    desc: 'Create a personalized storefront for your brand in minutes. No coding, no hassle — just pick a design, add your products, and start selling across Uganda.',
    feat: ['4 professional templates', 'Custom branding & colors', 'Your own store URL'],
  },
  {
    icon: <Palette size={48} />,
    title: 'Pick Your Style',
    desc: 'Choose from four designer-crafted templates: Elegance (gold & dark), Minimal (clean & modern), Bold (vibrant & energetic), or Nature (organic & fresh). Every color is customizable.',
    feat: ['Live preview as you customize', 'Dark & light mode support', 'Mobile-friendly design'],
  },
  {
    icon: <Smartphone size={48} />,
    title: 'Accept UGX Payments Instantly',
    desc: 'Your customers can pay with MTN Mobile Money and Airtel Money from day one. Everything in Uganda Shillings — local shipping, local rates, local payments.',
    feat: ['MTN MoMo & Airtel Money', 'Flutterwave card payments', '14-day free trial, then 3,000 UGX/week'],
  },
];

export default function CreateStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [colors, setColors] = useState(template.colors);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [animation, setAnimation] = useState('subtle');

  useEffect(() => {
    setColors(template.colors);
    document.documentElement.setAttribute('data-theme', template.id === 'elegance' || template.id === 'bold' ? 'dark' : 'light');
    const root = document.documentElement;
    Object.entries(template.colors).forEach(([k, v]) => root.style.setProperty(`--${k === 'primary' ? 'primary' : k === 'secondary' ? 'primary-dark' : k === 'accent' ? 'primary-light' : k}`, v));
  }, [template]);

  useEffect(() => {
    if (slug.length >= 3) {
      api.get(`/stores/check-slug/${slug}`).then((r: any) => setSlugAvailable(r.data.available));
    }
  }, [slug]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/stores', { name, slug, template: template.id, colors, logoUrl: logoUrl || undefined, animation });
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
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>{slide.title}</h2>
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
                I agree to the <strong style={{ color: 'var(--text)' }}>Terms of Service</strong> and <strong style={{ color: 'var(--text)' }}>Privacy Policy</strong>. I understand that after a 14-day free trial, the subscription costs 3,000 UGX per week and can be cancelled anytime.
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
        {[{ n: 1, label: 'Template' }, { n: 2, label: 'Colors' }, { n: 3, label: 'Animation' }, { n: 4, label: 'Details' }].map(s => (
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Choose a template</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Pick a starting design. You can customize colors in the next step.</p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => { setTemplate(t); }} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', borderRadius: '0.75rem', border: `2px solid ${template.id === t.id ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.5rem', background: t.colors.bg, border: `2px solid ${t.colors.primary}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t.desc}</div>
                </div>
                {template.id === t.id && <Check size={20} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
        </div>
      )}

      {/* Step 2: Customize Colors */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Customize colors</h2>
          {Object.entries(colors).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ width: 100, fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{key}</label>
              <input type="color" value={val} onChange={e => { const c = { ...colors, [key]: e.target.value }; setColors(c); document.documentElement.style.setProperty(`--${key}`, e.target.value); }} style={{ width: 48, height: 40, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
              <input type="text" value={val} onChange={e => { const c = { ...colors, [key]: e.target.value }; setColors(c); }} style={{ flex: 1 }} className="input" />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(3)}>Next: Animation <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 3: Animation */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Animation & Effects</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Set the motion and 3D feel of your store. Preview changes live.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { id: 'none', name: 'Static', desc: 'Clean, minimal — no animations', icon: '▬' },
              { id: 'subtle', name: 'Subtle', desc: 'Gentle fades, smooth hover effects — balanced', icon: '◐' },
              { id: 'dynamic', name: 'Dynamic', desc: 'Slide-ins, scale effects, bold transitions', icon: '◈' },
            ].map(a => (
              <button key={a.id} onClick={() => setAnimation(a.id)} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', borderRadius: '0.75rem', border: `2px solid ${animation === a.id ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 48, height: 48, borderRadius: '0.5rem', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.desc}</div>
                </div>
                {animation === a.id && <Check size={20} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(4)}>Next: Details <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Name & Slug */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Store details</h2>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store Name</label>
            <input className="input" value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="My Store" />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>/store/</span>
              <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))} placeholder="my-store" />
            </div>
            {slug.length >= 3 && (
              <span style={{ fontSize: '0.8125rem', color: slugAvailable ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                {slugAvailable ? '✓ Available' : '✗ Already taken'}
              </span>
            )}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>Store Logo (optional)</label>
            <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Upload a rectangular logo image or leave empty to use your store name as text.
            </span>
            {logoUrl && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoUrl} alt="Logo preview" style={{ maxHeight: 50, maxWidth: 250, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          {error && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--error)', marginBottom: '0.75rem' }}>{error}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {error.includes('store reservation') ? (
                  <>
                    <a href="tel:+256740157510" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>📞 Call</a>
                    <a href="https://wa.me/256740157510" target="_blank" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>💬 WhatsApp</a>
                    <a href="mailto:darlenzai01@gmail.com" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>✉️ Email</a>
                  </>
                ) : (
                  <a href="mailto:darlenzai01@gmail.com" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>✉️ Email Mr.Dev</a>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!name || !slug || !slugAvailable || submitting} onClick={handleSubmit}>
              {submitting ? 'Creating...' : 'Launch Store'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
