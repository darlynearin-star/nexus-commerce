'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Truck } from 'lucide-react';

/**
 * Store hero.
 *
 * Editorial split rather than text-on-a-flat-panel: the merchant's own best
 * photograph does the selling on the right, the copy stays on the page's own
 * background on the left. Deliberately not text on top of the image — a
 * merchant will eventually upload a white-background packshot, and white type
 * over it would vanish. A split layout survives any photograph.
 *
 * Falls back to a single centred column of copy when no product has an image,
 * so a brand-new store still gets the same type treatment.
 */
export default function StoreHero({
  store,
  featured,
  newArrivals,
  latest = [],
}: {
  store: any;
  featured: any[];
  newArrivals: any[];
  latest?: any[];
}) {
  const heroProduct = [...featured, ...newArrivals, ...latest].find(
    (p: any) => Array.isArray(p?.images) && p.images[0]
  );

  const storeName: string = store?.name || 'Store';
  const location: string = store?.settings?.location || '';
  const threshold: number = store?.settings?.shippingThreshold || 0;

  const lede = location
    ? `A considered collection, delivered across ${location}.`
    : 'A considered collection of everyday pieces, updated regularly.';

  const hasNew = newArrivals.length > 0;
  // The rail below the hero is New arrivals, then Featured, then Latest —
  // whichever actually has stock. The jump link has to name what is there.
  const secondary = hasNew
    ? { label: 'New arrivals' }
    : featured.length > 0
      ? { label: 'Featured' }
      : latest.length > 0
        ? { label: 'Latest pieces' }
        : null;

  return (
    <section className="store-hero">
      <div className="container">
        <div className={`store-hero__grid${heroProduct ? '' : ' store-hero__grid--text'}`}>
          <div className="store-hero__copy">
            <p className="eyebrow">{hasNew ? 'New in' : 'The collection'}</p>
            <h1 className="store-hero__title">{storeName}</h1>
            <p className="store-hero__lede">{lede}</p>

            <div className="store-hero__actions">
              <Link
                href={`/store/${store?.slug}/shop`}
                className="btn btn-primary"
                style={{ fontSize: '0.9375rem', padding: '0.75rem 1.75rem' }}
              >
                Shop the collection <ArrowRight size={17} />
              </Link>
              {secondary && (
                <a href="#new-arrivals" className="btn btn-secondary">
                  {secondary.label}
                </a>
              )}
            </div>

            {(location || threshold > 0) && (
              <ul className="store-hero__meta">
                {location && (
                  <li>
                    <MapPin size={14} /> {location}
                  </li>
                )}
                {threshold > 0 && (
                  <li>
                    <Truck size={14} /> Free delivery over UGX {threshold.toLocaleString()}
                  </li>
                )}
              </ul>
            )}
          </div>

          {heroProduct && (
            <Link
              href={`/store/${store?.slug}/product/${heroProduct.slug}`}
              className="store-hero__media"
              aria-label={`View ${heroProduct.name}`}
            >
              <Image
                src={heroProduct.images[0]}
                alt={heroProduct.name}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 46vw"
              />
              <span className="store-hero__caption">
                <span>Featured</span>
                <strong>{heroProduct.name}</strong>
                {typeof heroProduct.price === 'number' && (
                  <em>UGX {heroProduct.price.toLocaleString()}</em>
                )}
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
