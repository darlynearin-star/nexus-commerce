'use client';
import Link from 'next/link';
import { useStore } from '@/lib/store-context';

export default function StoreFooter() {
  const { store } = useStore();

  if (!store) return null;

  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '3rem 0', marginTop: '3rem' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} style={{ height: 32, maxWidth: 160, objectFit: 'contain' }} />
            ) : (
              store.name
            )}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {store.settings?.location || 'Uganda'}
          </p>
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Shop</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Link href={`/store/${store.slug}/shop`} style={{ color: 'inherit', textDecoration: 'none' }}>All Products</Link>
            <Link href={`/store/${store.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          </div>
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>Contact Us</span>
            <span>Shipping Info</span>
            <span>Returns</span>
          </div>
        </div>
      </div>
      <div className="container" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.8125rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</span>
        <span style={{ color: 'var(--border)', margin: '0 0.5rem' }}>|</span>
        <span style={{ color: 'var(--text-secondary)' }}>Powered by <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Lyn-nyx Stores</Link></span>
      </div>
    </footer>
  );
}
