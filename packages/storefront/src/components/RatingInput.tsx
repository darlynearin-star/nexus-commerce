'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';

export default function RatingInput({ value, onChange, size = 22 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }} role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = (hover ?? value) >= i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
          >
            <Star size={size} fill={filled ? 'var(--gold)' : 'none'} color={filled ? 'var(--gold)' : 'var(--border)'} />
          </button>
        );
      })}
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>
        {value ? `${value} out of 5` : 'Select a rating'}
      </span>
    </div>
  );
}