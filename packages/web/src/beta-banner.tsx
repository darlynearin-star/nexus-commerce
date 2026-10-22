'use client';
import { useEffect, useState } from 'react';

export const BETA_DISMISS_KEY = 'nexus-beta-dismissed';

/**
 * Site-wide beta notice.
 *
 * Three things it has to say, in plain language:
 *   1. the product is still being tested, so small problems are expected
 *   2. what people pay goes to running costs (servers, database, storage)
 *   3. prices may change, especially once beta ends
 *
 * Dismissal is per browser *session* (sessionStorage), not permanent: a
 * pricing notice that can be dismissed forever is easy to miss, but one that
 * cannot be dismissed at all is in the way while you work. sessionStorage
 * clears when the tab is closed, so it comes back on the next visit.
 *
 * Colours use the host app's theme variables with fallbacks, so it inherits
 * light/dark mode and a store's own palette without extra props.
 *
 * Sizing is intentionally responsive. The full legal wording is ~40 words,
 * which is four or five lines in a phone viewport and pushes the actual store
 * off the first screen. Below tablet width we swap to one sentence that still
 * carries all three disclosures, tighten the padding, and shrink the type;
 * the full wording returns on desktop where there is room for it. Both
 * variants live in the markup (never conditionally rendered) so this stays
 * SSR-safe and needs no matchMedia listener.
 */
export default function BetaBanner({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  // Start hidden so the server-rendered markup and the first client render
  // agree, then reveal after reading storage.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(BETA_DISMISS_KEY) === '1');
    } catch {
      // Storage blocked (private mode / strict settings): show the banner.
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(BETA_DISMISS_KEY, '1');
    } catch {
      // Nothing to persist to; just hide it for this render.
    }
    setDismissed(true);
  };

  return (
    <div
      role="note"
      aria-label="Beta notice"
      className={`nx-beta${compact ? ' nx-beta--compact' : ''}`}
    >
      {/* Scoped rules: the package ships no stylesheet, and inline styles
          cannot express a media query. */}
      <style>{`
        .nx-beta {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 0.625rem 1rem;
          background: var(--warning-bg, rgba(192,127,46,0.14));
          border-bottom: 1px solid var(--warning-border, rgba(192,127,46,0.35));
          color: var(--text, #f4f1ea);
          font-size: 0.8125rem;
          line-height: 1.5;
          text-wrap: pretty;
        }
        .nx-beta--compact { padding: 0.5rem 0.875rem; font-size: 0.75rem; }
        .nx-beta__body { margin: 0; flex: 1 1 auto; min-width: 0; }
        .nx-beta__short { display: none; }
        .nx-beta__close {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          margin-top: -2px;
          margin-right: -6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: var(--radius-sm, 6px);
          background: transparent;
          color: var(--text-secondary, #a8a096);
          cursor: pointer;
          font-size: 1.125rem;
          line-height: 1;
          transition: background 0.15s, color 0.15s;
        }
        .nx-beta__close:hover, .nx-beta__close:focus-visible {
          background: var(--bg-secondary, rgba(0,0,0,0.06));
          color: var(--text, inherit);
        }
        /* Phones and tablets: one compact sentence instead of the full
           disclosure, which otherwise eats the first screen. 900px covers
           every portrait tablet (iPad Pro 11" is 834 CSS px wide). */
        @media (max-width: 900px) {
          .nx-beta {
            gap: 0.5rem;
            padding: 0.4375rem 0.75rem;
            font-size: 0.75rem;
            line-height: 1.45;
            align-items: center;
          }
          .nx-beta__body { font-size: 0.75rem; }
          .nx-beta__long { display: none; }
          .nx-beta__short { display: inline; }
          .nx-beta__close { width: 26px; height: 26px; margin-top: 0; margin-right: -4px; font-size: 1rem; }
        }
        @media (max-width: 360px) {
          .nx-beta { font-size: 0.6875rem; padding: 0.375rem 0.625rem; }
        }
      `}</style>

      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          padding: '0.05rem 0.4rem',
          borderRadius: 4,
          background: 'var(--warning, #c07f2e)',
          color: '#fff',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Beta
      </span>

      <p className="nx-beta__body">
        {/* Desktop: the full notice. Hidden below 820px. */}
        <span className="nx-beta__long">
          Lyn-nyx is currently in beta. Some features may be incomplete or may change as the
          service develops.
          {' '}
          <strong style={{ fontWeight: 600 }}>
            Subscription fees cover the cost of operating the platform
          </strong>
          {' '}
          (infrastructure, databases and file storage) and do not represent a profit, which
          means pricing may be adjusted during beta and
          {' '}
          <em>is likely to change once beta ends</em>.
        </span>
        {/* Phones/tablets: same three disclosures, one sentence. */}
        <span className="nx-beta__short">
          Beta: features and pricing may change. Fees cover running costs, not profit.
        </span>
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss beta notice for this visit"
        className="nx-beta__close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
