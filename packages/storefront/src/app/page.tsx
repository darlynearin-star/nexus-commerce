'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Store, Palette, Globe, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '6rem 1rem 4rem', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glow)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '0.375rem 1rem', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '2rem' }}>
          <Sparkles size={14} /> Multi-Store Platform
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '1rem' }}>
          Launch Your <span className="gradient-gold">Custom Store</span> in Minutes
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Create a personalized online store for your fashion and accessories brand. Pick a template, set your colors, and start selling — no code needed.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={user ? '/create-store' : '/register'} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            Create Your Store <ArrowRight size={18} />
          </Link>
          <Link href="/store/adorn" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            View Demo Store
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 600, marginBottom: '3rem' }}>Everything you need to sell</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: <Palette size={24} />, title: 'Custom Templates', desc: 'Choose from 4 professionally designed templates and customize every color to match your brand.' },
              { icon: <Store size={24} />, title: 'Your Own Storefront', desc: 'Each store gets a unique URL — share it directly with your customers on social media.' },
              { icon: <Globe size={24} />, title: 'UGX Pricing', desc: 'Built for Uganda — prices in UGX, local shipping rates, and Kampala store location.' },
              { icon: <Shield size={24} />, title: 'Full Control', desc: 'Toggle your store on/off anytime, manage products, track orders, and view analytics.' },
            ].map((f, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 1rem', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 600, marginBottom: '3rem' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {[
              { step: '1', title: 'Sign up', desc: 'Create your account with email in seconds.' },
              { step: '2', title: 'Pick a template', desc: 'Choose a design that fits your brand and customize the colors.' },
              { step: '3', title: 'Add your products', desc: 'List your items, set prices in UGX, and organize categories.' },
              { step: '4', title: 'Go live', desc: 'Share your store link and start selling. Full analytics included.' },
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

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Ready to launch?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create your store in under 5 minutes — free to start.</p>
        <Link href={user ? '/create-store' : '/register'} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.875rem 2.5rem' }}>
          Get Started <ArrowRight size={18} />
        </Link>
      </section>

    </div>
  );
}
