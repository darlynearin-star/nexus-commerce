'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { categoryIcon } from '@/lib/category-icons';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const { isDark } = useTheme();

  useEffect(() => { api.get('/categories').then((r: any) => setCategories(r.data)); }, []);

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Categories</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {categories.map((cat: any) => (
          <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{categoryIcon(cat.slug, cat.name)}</div>
            <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{cat.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{cat._count?.products || 0} Products</p>
            {cat.children?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.75rem' }}>
                {cat.children.map((child: any) => (
                  <span key={child.id} className={`badge ${isDark ? 'badge-gold' : 'badge-silver'}`}>{child.name}</span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
