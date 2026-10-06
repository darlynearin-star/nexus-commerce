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
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: compact ? '0.5rem 0.875rem' : '0.625rem 1rem',
        background: 'var(--warning-bg, rgba(192,127,46,0.14))',
        borderBottom: '1px solid var(--warning-border, rgba(192,127,46,0.35))',
        color: 'var(--text, #f4f1ea)',
        fontSize: compact ? '0.75rem' : '0.8125rem',
        lineHeight: 1.5,
      }}
    >
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

      <p style={{ margin: 0, flex: 1 }}>
        Lyn-nyx is still being tested, so you may notice small problems while we fix them.
        {' '}
        <strong style={{ fontWeight: 600 }}>What you pay only covers what it costs to run the service</strong>
        {' '}
        (servers, database and file storage), not profit, so prices may change as we grow
        {' '}
        <em>and are likely to change once beta ends</em>.
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss beta notice for this visit"
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 22,
          height: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--text-secondary, #a8a096)',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}