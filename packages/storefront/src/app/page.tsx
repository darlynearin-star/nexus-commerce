'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Store, Palette, Globe, Smartphone, Gift, CreditCard, ArrowRight, CheckCircle, Sparkles, Zap, Layout, Users, DollarSign, Clock, AlertTriangle, ExternalLink, ShoppingBag, BookOpen, HelpCircle, Shield } from 'lucide-react';

function calcDaysRemaining(trialEnd: string): number {
  const end = new Date(trialEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1rem' }}>
        <div className="skeleton" style={{ height: 60, width: '60%', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 120 }} /></div>)}
        </div>
      </div>
    );
  }

  const isGuest = !user;
  const hasStore = !!user?.retailer?.storeSlug;
  const sub = user?.retailer?.subscription;
  const ctaHref = '/create-store';

  // Logged-in user with a store → dashboard view
  if (user && hasStore) {
    const daysLeft = sub ? calcDaysRemaining(sub.trialEnd) : 14;
    const isTrial = !sub || sub.status === 'TRIAL';
    const isActive = sub?.status === 'ACTIVE';
    const storeSlug = user.retailer!.storeSlug;
    const storeName = user.retailer!.storeName;
    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
    const dashboardUrl = process.env.NEXT_PUBLIC_RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';

    return (
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* Tier progress */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '1rem', background: 'var(--glow)' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your Plan</p>
              {isTrial && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p style={{ fontWeight: 600 }}>14-Day Free Trial</p>
                    <p style={{ fontSize: '0.875rem', color: daysLeft <= 3 ? 'var(--error)' : 'var(--text-secondary)' }}>
                      {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : 'Expired'}
                    </p>
                  </div>
                </div>
              )}
              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p style={{ fontWeight: 600 }}>Active — 3,000 UGX/week</p>
                    {sub?.nextBillingDate && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Next billing: {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {sub?.status === 'CANCELLED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--error)' }}>Cancelled</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Reactivate in your dashboard</p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href={`${storefrontUrl}/store/${storeSlug}`} target="_blank" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} /> Visit My Store <ExternalLink size={14} />
              </a>
              <a href={`${dashboardUrl}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layout size={18} /> Dashboard
              </a>
            </div>
          </div>
        </section>

        {/* Guides, tips & tricks */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} style={{ color: 'var(--primary)' }} /> Guides &amp; Tips
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[
              { icon: <ShoppingBag size={20} />, title: 'Add your first products', desc: 'Upload photos, set UGX prices, organize categories, and manage stock from your dashboard.' },
              { icon: <Palette size={20} />, title: 'Customize your store', desc: 'Change templates, colors, upload a logo, and set your store name to match your brand.' },
              { icon: <Globe size={20} />, title: 'Share your store link', desc: `Your store is live at ${storefrontUrl}/store/${storeSlug}. Share it everywhere!` },
              { icon: <CreditCard size={20} />, title: 'Payment & subscription', desc: 'MTN MoMo and Airtel Money supported. 3,000 UGX/week after the free trial.' },
              { icon: <Users size={20} />, title: 'Grow your customers', desc: 'Track orders, view customer data, and build relationships through your dashboard.' },
              { icon: <HelpCircle size={20} />, title: 'Need help?', desc: 'Email darlenzai01@gmail.com for support, questions, or bug reports.' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{item.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} style={{ color: 'var(--primary)' }} /> Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Link href="/store/adorn" className="card" style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', cursor: 'pointer' }}>
              <Store size={24} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>View Demo Store</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>See what a finished store looks like</span>
            </Link>
            <a href={`${dashboardUrl}/dashboard#token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '')}`} target="_blank" className="card" style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center', cursor: 'pointer' }}>
              <Layout size={24} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Open Dashboard</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Manage products, orders, settings</span>
            </a>
          </div>
        </section>

      </div>
    );
  }

  // Not logged in → marketing landing page
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '5rem 1rem 3rem', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glow)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.375rem 1rem', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
          <Gift size={14} /> <strong>14-Day Free Trial</strong> — No credit card required
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '1rem' }}>
          Launch Your <span className="gradient-gold">Fashion Store</span> in Minutes
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          Create a personalized online store for your brand. Pick a template, set your colors, add products — and start selling. No coding, no hassle.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} style={{ color: 'var(--primary)' }} /> 14 days free</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} style={{ color: 'var(--primary)' }} /> 3,000 UGX/week after</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} style={{ color: 'var(--primary)' }} /> MTN MoMo &amp; Airtel</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} style={{ color: 'var(--primary)' }} /> Cancel anytime</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link href="/store/adorn" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            View Demo Store
          </Link>
        </div>
      </section>

      {/* Pricing highlight */}
      <section style={{ padding: '2rem 1rem' }}>
        <div className="container" style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid var(--primary)', borderRadius: '1rem', background: 'var(--glow)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>After your free trial</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>3,000 UGX <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ week</span></p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Cancel anytime. No long-term contracts.</p>
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 600, marginBottom: '3rem' }}>Everything you need to sell</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: <Layout size={24} />, title: '4 Templates', desc: 'Elegance, Minimal, Bold, Nature — pick the look that fits your brand.' },
              { icon: <Palette size={24} />, title: 'Custom Branding', desc: 'Set your colors, upload your logo and banner. Your store, your identity.' },
              { icon: <Globe size={24} />, title: 'Your Own URL', desc: 'Get a unique Adorn URL for your store. Share it everywhere.' },
              { icon: <Store size={24} />, title: 'Own Products', desc: 'List your items, set UGX prices, organize categories, manage stock.' },
              { icon: <Users size={24} />, title: 'Own Customers', desc: 'Build your customer base. Track orders and engagement.' },
              { icon: <Smartphone size={24} />, title: 'Mobile Money', desc: 'Accept MTN MoMo and Airtel Money payments from day one.' },
              { icon: <DollarSign size={24} />, title: 'UGX Pricing', desc: 'Everything in Uganda Shillings. Local shipping, local rates.' },
              { icon: <Zap size={24} />, title: 'Fast Setup', desc: 'From signup to live store in under 10 minutes. No code needed.' },
            ].map((f, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section style={{ padding: '4rem 1rem', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Professional Templates</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.9375rem' }}>Choose from four designer-crafted templates and customize every color.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {[
              { name: 'Elegance', colors: ['#D4A843', '#0A0A0A'], desc: 'Gold & dark luxury' },
              { name: 'Minimal', colors: ['#FFFFFF', '#1A1A2E'], desc: 'Clean & modern' },
              { name: 'Bold', colors: ['#FF6B35', '#0A0A0A'], desc: 'Vibrant & energetic' },
              { name: 'Nature', colors: ['#2D6A4F', '#F0F7F4'], desc: 'Organic & fresh' },
            ].map((t, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  {t.colors.map((c, j) => <div key={j} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '1px solid var(--border)' }} />)}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{t.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 600, marginBottom: '3rem' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { step: '1', title: 'Sign up', desc: 'Create your account with email. Free for 14 days.' },
              { step: '2', title: 'Pick a template', desc: 'Choose from Elegance, Minimal, Bold, or Nature. Customize colors to match your brand.' },
              { step: '3', title: 'Add products', desc: 'Upload photos, set UGX prices, organize categories, and manage stock.' },
              { step: '4', title: 'Go live', desc: 'Share your store link. Start accepting MTN MoMo and Airtel Money payments immediately.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{s.step}</div>
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
      <section style={{ textAlign: 'center', padding: '5rem 1rem', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Start selling today</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1rem' }}>14 days free. Then 3,000 UGX/week. Cancel anytime.</p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>MTN MoMo &amp; Airtel Money supported. No coding required.</p>
        <Link href="/register" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.875rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} /> Start Your Free Trial
        </Link>
      </section>

    </div>
  );
}
