'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const DEMO_SLUG = 'adorn';

type PreviewProduct = {
  id: string;
  name: string;
  price: number;
  images?: string[];
};

/**
 * A live store, rendered small, inside browser chrome.
 *
 * The old hero was stock editorial photography — it set a mood but never
 * showed the thing being sold. This shows an actual Lyn-nyx storefront with
 * its own products, fetched from the demo store, so the first thing a
 * merchant sees is what they would be buying.
 *
 * It is a mock, not an iframe: the real store sends X-Frame-Options: DENY,
 * and embedding a whole Next app would cost far more than it is worth. The
 * markup below is deliberately tiny (nothing interactive inside), with the
 * one real link underneath.
 */
export default function LandingStorePreview() {
  const [products, setProducts] = useState<PreviewProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Same-origin: next.config rewrites /api/* to the API host, and the
    // x-store-slug header is what resolves the store. Failure is silent —
    // the mock renders its empty state rather than blocking the hero.
    fetch(`/api/products?limit=4&sort=createdAt&order=desc`, {
      headers: { 'x-store-slug': DEMO_SLUG },
    })
      .then(r => (r.ok ? r.json() : null))
      .then((json: any) => {
        if (!cancelled && Array.isArray(json?.data)) {
          setProducts(json.data.slice(0, 4));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = products[0];
  const tiles = products.slice(1, 4);

  return (
    <div className="lp-demo">
      <div className="lp-demo__frame" aria-hidden="true">
        <div className="lp-demo__bar">
          <span className="lp-demo__dots"><i /><i /><i /></span>
          <span className="lp-demo__url">lynnyxstores.vercel.app/store/{DEMO_SLUG}</span>
        </div>

        <div className="lp-demo__viewport">
          <div className="lp-demo__site">
            <div className="lp-demo__nav">
              <span className="lp-demo__brand">Adorn</span>
              <span className="lp-demo__links"><i>Shop</i><i>New in</i><i>Cart</i></span>
            </div>

            <div className="lp-demo__hero">
              {hero?.images?.[0] && (
                <Image src={hero.images[0]} alt="" fill sizes="(max-width: 900px) 80vw, 320px" />
              )}
              <div className="lp-demo__herotext">
                <span>New in</span>
                <strong>{hero?.name || 'The collection'}</strong>
                {hero && <em>UGX {hero.price.toLocaleString()}</em>}
              </div>
            </div>

            <div className="lp-demo__grid">
              {(tiles.length ? tiles : [null, null, null]).map((p, i) => (
                <div className="lp-demo__tile" key={p?.id || i}>
                  <div className="lp-demo__thumb">
                    {p?.images?.[0] && <Image src={p.images[0]} alt="" fill sizes="120px" />}
                  </div>
                  <span>{p?.name || '\u00a0'}</span>
                  <em>{p ? `UGX ${p.price.toLocaleString()}` : '\u00a0'}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lp-demo__caption">
        <span>A real store, running on Lyn-nyx.</span>
        <Link href={`/store/${DEMO_SLUG}`} className="lp-demo__link">
          Open the live demo <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
