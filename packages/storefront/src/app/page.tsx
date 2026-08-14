'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Store, Palette, Globe, Smartphone, Gift, CreditCard, ArrowRight, CheckCircle, Layout, Users, DollarSign, Clock, ExternalLink, ShoppingBag, BookOpen, HelpCircle, EyeOff, Terminal, TrendingUp, ShieldCheck, Truck } from 'lucide-react';

const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
const dashboardUrl = process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';
const devDashUrl = process.env.NEXT_PUBLIC_DEVELOPER_DASHBOARD_URL || 'https://nexus-commerce-developer-dashboard.vercel.app';

function getStoreStatus(store: any): { label: string; color: string; icon: any; message: string } {
  if (store.isActive) {
    return { label: 'Active', color: 'var(--success)', icon: <CheckCircle size={16} />, message: 'Your store is live and accepting orders.' };
  }
  return { label: 'Disabled', color: 'var(--error)', icon: <EyeOff size={16} />, message: 'Your store has been disabled. Please contact Mr.Dev at darlenzai01@gmail.com for assistance.' };
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [store, setStore] = useState<any | null>(undefined);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && mounted) {
      setStoreLoading(true);
      api.get('/stores/mine').then((r: any) => setStore(r.data)).catch(() => setStore(null)).finally(() => setStoreLoading(false));
    } else if (!user && mounted) {
      setStore(undefined);
    }
  }, [user, mounted]);

  if (!mounted || loading || storeLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1rem' }}>
        <div className="skeleton" style={{ height: 56, width: '55%', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ height: 20, width: '38%', marginBottom: '2rem' }} />
        <div className="product-grid">
          {[1, 2, 3].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 200, aspectRatio: '1' }} /></div>)}
        </div>
      </div>
    );
  }

  const isGuest = !user;
  const hasStore = !!store;

  // Logged-in user with a store → dashboard view
  if (user && hasStore) {
    const status = getStoreStatus(store);
    const storeSlug = store.slug;
    const storeName = store.name;

    return (
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* Store status bar */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem 1.5rem', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: status.color }}>{status.icon}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '1rem' }}>{storeName}</p>
                <p style={{ fontSize: '0.875rem', color: status.color }}>{status.label}: {status.message}</p>
              </div>
            </div>
            {store.isActive && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingBag size={18} /> Visit My Store <ExternalLink size={14} />
                </a>
                <a href={`${dashboardUrl}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layout size={18} /> Dashboard
                </a>
                {user.role === 'SUPER_DEVELOPER' && (
                  <a href={`${devDashUrl}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Terminal size={18} /> To Dev Dashboard
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Guides, tips & tricks */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="section-head">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--primary)' }} /> Guides &amp; Tips
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: <ShoppingBag size={20} />, title: 'Add your first products', desc: 'Upload photos, set UGX prices, organize categories, and manage stock from your dashboard.' },
              { icon: <Palette size={20} />, title: 'Customize your store', desc: 'Change templates, colors, upload a logo, and set your store name to match your brand.' },
              { icon: <Globe size={20} />, title: 'Share your store link', desc: `Your store is live at ${storefrontUrl}/store/${storeSlug}. Share it everywhere!` },
              { icon: <CreditCard size={20} />, title: 'Payment & subscription', desc: 'MTN MoMo and Airtel Money supported. 3,000 UGX/week after the free trial.' },
              { icon: <Users size={20} />, title: 'Grow your customers', desc: 'Track orders, view customer data, and build relationships through your dashboard.' },
              { icon: <HelpCircle size={20} />, title: 'Need help?', desc: 'Email Mr.Dev at darlenzai01@gmail.com for support, questions, or bug reports.' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.625rem' }}>{item.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <div className="section-head">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'var(--primary)' }} /> Quick Actions
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Link href="/store/adorn" className="card" style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem', cursor: 'pointer' }}>
              <Store size={22} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>View Demo Store</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>See what a finished store looks like</span>
            </Link>
            <a href={`${dashboardUrl}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`} target="_blank" className="card" style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem', cursor: 'pointer' }}>
              <Layout size={22} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>Open Dashboard</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Manage products, orders, settings</span>
            </a>
          </div>
        </section>

      </div>
    );
  }

  // Logged-in user without a store → create-store prompt
  if (user && !hasStore) {
    return (
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '4rem 1rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow">Get started</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>You don&apos;t have a store yet</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: 520 }}>
            Create your personalized online fashion store in minutes. Pick a template, set your colors, add your products, and start selling across Uganda. No coding needed.
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>How it works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { step: '1', title: 'Sign up & pick a template', desc: 'Choose from Elegance, Minimal, Bold, or Nature. Customize every color.' },
              { step: '2', title: 'Add your products', desc: 'Upload photos, set UGX prices, organize categories, and manage stock.' },
              { step: '3', title: 'Share your store link', desc: 'Get a unique URL. Accept MTN MoMo & Airtel Money payments immediately.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--primary)', flexShrink: 0 }}>{s.step}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{s.title}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link href="/create-store" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={18} /> Create Your Store
        </Link>
        {user.role === 'SUPER_DEVELOPER' && (
          <div style={{ marginTop: '0.75rem' }}>
            <a href={`${devDashUrl}/dashboard`} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} /> To Dev Dashboard
            </a>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1.25rem' }}>14-day free trial · 3,000 UGX/week after · Cancel anytime</p>
      </div>
    );
  }

  // Not logged in → marketing landing page
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Hero */}
      <section className="hero-overlay" style={{ padding: 'clamp(3.5rem, 9vw, 6rem) 0' }}>
        <div className="container">
          <div style={{ maxWidth: 640 }}>
            <p className="eyebrow">For independent merchants across Uganda</p>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              Launch your fashion store in minutes.
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.65, marginBottom: '1.75rem' }}>
              Pick a template, set your colors, add your products, and start selling. No coding, no hassle. MTN MoMo &amp; Airtel Money built in.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <Link href="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.6875rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <Link href="/store/adorn" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.6875rem 1.5rem' }}>
                View Demo Store
              </Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle size={15} style={{ color: 'var(--success)' }} /> 14 days free</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle size={15} style={{ color: 'var(--success)' }} /> 3,000 UGX/week after</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><CreditCard size={15} style={{ color: 'var(--success)' }} /> MTN MoMo &amp; Airtel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing strip */}
      <section style={{ padding: '0 0 clamp(2.5rem, 6vw, 4rem)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {[
              { icon: <Clock size={18} />, k: 'No credit card required', v: '14-day free trial' },
              { icon: <Truck size={18} />, k: 'Local-first', v: 'Shipping & pricing in UGX' },
              { icon: <ShieldCheck size={18} />, k: 'Cancel anytime', v: 'No long-term contracts' },
              { icon: <CreditCard size={18} />, k: 'Weekly after trial', v: '3,000 UGX / week' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'var(--bg)', padding: '1.25rem' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.375rem' }}>{f.icon}</div>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>{f.v}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{f.k}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section className="section bg-secondary" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <p className="eyebrow">Everything included</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)' }}>Everything you need to sell</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: <Layout size={20} />, title: '4 Templates', desc: 'Elegance, Minimal, Bold, Nature: pick the look that fits your brand.' },
              { icon: <Palette size={20} />, title: 'Custom Branding', desc: 'Set your colors, upload your logo and banner. Your store, your identity.' },
              { icon: <Globe size={20} />, title: 'Your Own URL', desc: 'Get a unique Lyn-nyx Stores URL for your store. Share it everywhere.' },
              { icon: <Store size={20} />, title: 'Own Products', desc: 'List your items, set UGX prices, organize categories, manage stock.' },
              { icon: <Users size={20} />, title: 'Own Customers', desc: 'Build your customer base. Track orders and engagement.' },
              { icon: <Smartphone size={20} />, title: 'Mobile Money', desc: 'Accept MTN MoMo and Airtel Money payments from day one.' },
              { icon: <DollarSign size={20} />, title: 'UGX Pricing', desc: 'Everything in Uganda Shillings. Local shipping, local rates.' },
              { icon: <TrendingUp size={20} />, title: 'Fast Setup', desc: 'From signup to live store in under 10 minutes. No code needed.' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--primary)', marginTop: '0.125rem', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.125rem', fontSize: '0.9375rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <p className="eyebrow">Templates</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)' }}>A starting point that fits your brand</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {[
              { name: 'Elegance', colors: ['#C9A76E', '#14120E'], desc: 'Burnished gold & warm dark' },
              { name: 'Minimal', colors: ['#FBFAF7', '#1F1C16'], desc: 'Clean & understated' },
              { name: 'Bold', colors: ['#FF5540', '#140F0E'], desc: 'Vibrant & energetic' },
              { name: 'Nature', colors: ['#2D6A4F', '#F4F0E6'], desc: 'Organic & fresh' },
            ].map((t, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
                  {t.colors.map((c, j) => <div key={j} style={{ width: 22, height: 22, borderRadius: 999, background: c, border: '1px solid var(--border)' }} />)}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{t.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <p className="eyebrow">Process</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)' }}>How it works</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { step: '1', title: 'Sign up', desc: 'Create your account with email. Free for 14 days.' },
              { step: '2', title: 'Pick a template', desc: 'Choose from Elegance, Minimal, Bold, or Nature. Customize colors to match your brand.' },
              { step: '3', title: 'Add products', desc: 'Upload photos, set UGX prices, organize categories, and manage stock.' },
              { step: '4', title: 'Go live', desc: 'Share your store link. Start accepting MTN MoMo and Airtel Money payments immediately.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, border: '1px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{s.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ textAlign: 'center', padding: 'clamp(3.5rem, 8vw, 5rem) 1rem' }}>
        <div className="container">
          <p className="eyebrow">Ready when you are</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.75rem' }}>Start selling today</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.375rem', fontSize: '1rem' }}>14 days free. Then 3,000 UGX/week. Cancel anytime.</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.875rem' }}>MTN MoMo &amp; Airtel Money supported. No coding required.</p>
          <Link href="/register" className="btn btn-primary" style={{ fontSize: '1.0625rem', padding: '0.8125rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gift size={18} /> Start Your Free Trial
          </Link>
        </div>
      </section>

    </div>
  );
}