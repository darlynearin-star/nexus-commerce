'use client';
import { Star } from 'lucide-react';

export default function StarRating({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= Math.round(rating) ? 'var(--gold)' : 'none'}
          color={i <= Math.round(rating) ? 'var(--gold)' : 'var(--border)'} />
      ))}
      {count !== undefined && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>({count})</span>}
    </div>
  );
}
