'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Power, ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';

const TEMPLATE_LABELS: Record<string, string> = { elegance: 'Elegance', minimal: 'Minimal', bold: 'Bold', nature: 'Nature' };

export default function StoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'DEVELOPER' && user.role !== 'SUPER_DEVELOPER') { router.push('/login'); return; }
    api.get('/stores').then((r: any) => setStores(r.data || [])).catch((e: any) => console.error('API error:', e)).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;

  async function toggleStore(id: string, currentActive: boolean) {
    try {
      await api.post(`/stores/${id}/toggle`);
      setStores(stores.map(s => s.id === id ? { ...s, isActive: !currentActive } : s));
    } catch (e: any) { console.error('Error:', e); }
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading stores...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Stores</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage all stores on the platform</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Store</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Owner</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Template</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Created</th>
              <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{store.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}><Link href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'}/store/${store.slug}`} target="_blank" style={{ color: 'var(--primary)' }}>/{store.slug}</Link></div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{store.owner?.firstName} {store.owner?.lastName}<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{store.owner?.email}</span></td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{TEMPLATE_LABELS[store.theme?.template] || store.theme?.template || '—'}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(store.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button onClick={() => toggleStore(store.id, store.isActive)} className={`badge ${store.isActive ? 'badge-success' : 'badge-error'}`} style={{ cursor: 'pointer', border: 'none' }}>
                    <Power size={12} style={{ marginRight: '0.25rem' }} /> {store.isActive ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <Link href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'}/store/${store.slug}`} target="_blank" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Visit</Link>
                  </div>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No stores created yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
