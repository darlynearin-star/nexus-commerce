'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import StarRating from './StarRating';
import RatingInput from './RatingInput';

type Review = {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  createdAt?: string;
  isApproved?: boolean;
  customer?: { user?: { firstName?: string; lastName?: string } };
};

type Props = {
  productId: string;
  initialReviews?: Review[];
  isAuthenticated?: boolean;
};

function authorName(review: Review) {
  const u = review.customer?.user;
  const name = u && [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || 'Verified buyer';
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReviewsSection({ productId, initialReviews = [], isAuthenticated = false }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(initialReviews.length);
  const [distribution, setDistribution] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Review | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    storeApi
      .get(`/reviews/product/${productId}`)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data || {};
        const list: Review[] = data.reviews || [];
        setReviews(list);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews ?? list.length);
        const buckets = [0, 0, 0, 0, 0];
        (data.stats || []).forEach((row: { rating?: number; _count?: number }) => {
          const r = row.rating;
          const c = row._count;
          if (r && r >= 1 && r <= 5 && c) buckets[5 - r] = c;
        });
        setDistribution(buckets);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const submitReview = async () => {
    if (rating < 1) {
      setError('Please select a star rating to submit your review.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const res: any = await storeApi.post('/reviews', { productId, rating, title, content });
      const created: Review = res?.data;
      if (created) {
        setPending(created);
      }
      setNotice('Thanks for your review. It will appear once approved.');
      setRating(0);
      setTitle('');
      setContent('');
    } catch (e: any) {
      setError(e?.message || 'Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allReviews = pending ? [pending, ...reviews] : reviews;
  const maxBucket = Math.max(1, ...distribution);

  return (
    <section id="reviews" className="panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', marginBottom: '0.375rem' }}>
            Customer Reviews
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
              {averageRating ? averageRating.toFixed(1) : '0.0'}
            </span>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>/ 5</span>
            <StarRating rating={averageRating} size={16} />
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {totalReviews} review{totalReviews === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          {distribution.map((count, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', minWidth: 40 }}>{5 - i} star</span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(count / maxBucket) * 100}%`,
                    background: 'var(--gold)',
                    borderRadius: 3,
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: 20, textAlign: 'right' }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {allReviews.length === 0 && !loading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          allReviews.map(review => (
            <div
              key={review.id}
              style={{ padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                <StarRating rating={review.rating} size={13} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{authorName(review)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(review.createdAt)}</span>
              </div>
              {review.title && (
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{review.title}</p>
              )}
              {review.content && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{review.content}</p>
              )}
              {!review.isApproved && (
                <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.375rem' }}>Pending approval</p>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        {isAuthenticated ? (
          <>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', marginBottom: '0.75rem' }}>Write a Review</h4>
            <div style={{ marginBottom: '0.75rem' }}>
              <RatingInput value={rating} onChange={setRating} />
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Review title (optional)"
              className="input"
              style={{ width: '100%', maxWidth: 420, marginBottom: '0.625rem' }}
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your thoughts on this product (optional)"
              rows={3}
              className="input"
              style={{ width: '100%', maxWidth: 420, resize: 'vertical', marginBottom: '0.75rem' }}
            />
            {error && <p style={{ fontSize: '0.8125rem', color: 'var(--danger, #b91c1c)', marginBottom: '0.5rem' }}>{error}</p>}
            {notice && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>{notice}</p>
            )}
            <button className="btn" onClick={submitReview} disabled={submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              {submitting && <Loader2 size={14} className="spin" />}
              {submitting ? 'Submitting' : 'Submit Review'}
            </button>
          </>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Want to share your experience?{' '}
            <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
              Sign in to write a review
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}