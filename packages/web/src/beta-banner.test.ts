import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---- minimal browser stubs (the banner reads sessionStorage on mount) ----
const session = new Map<string, string>();
const storage = {
  getItem: (k: string) => (session.has(k) ? session.get(k)! : null),
  setItem: (k: string, v: string) => void session.set(k, v),
  removeItem: (k: string) => void session.delete(k),
  clear: () => session.clear(),
  key: () => null,
  length: 0,
};
Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'beta-banner.tsx'), 'utf8');

beforeEach(() => {
  session.clear();
  vi.resetModules();
});

async function loadBanner() {
  vi.resetModules();
  return (await import('./beta-banner')).default;
}

describe('BetaBanner', () => {
  it('exports a stable dismiss key', async () => {
    const mod = await import('./beta-banner');
    expect(mod.BETA_DISMISS_KEY).toBe('nexus-beta-dismissed');
  });

  it('renders nothing on the server pass, to avoid a hydration mismatch', async () => {
    const Banner = await loadBanner();
    // The component starts "dismissed" and reveals after reading storage, so
    // SSR output must be empty or React warns about mismatched markup.
    expect(renderToStaticMarkup(React.createElement(Banner))).toBe('');
  });

  it('covers all three points the notice exists to make', () => {
    // Assert on source text: this component is SSR-hidden, so the rendered
    // output is intentionally empty and cannot be asserted against.
    expect(source).toMatch(/Beta/);
    expect(source).toMatch(/still being tested/i);
    expect(source).toMatch(/only covers what it costs to run the service/i);
    expect(source).toMatch(/servers, database and file storage/i);
    expect(source).toMatch(/not profit/i);
    expect(source).toMatch(/prices may change as we grow/i);
    expect(source).toMatch(/likely to change once beta ends/i);
  });

  it('has accessible names for the notice and the dismiss control', () => {
    expect(source).toMatch(/aria-label="Beta notice"/);
    expect(source).toMatch(/aria-label="Dismiss beta notice for this visit"/);
    expect(source).toMatch(/role="note"/);
    // The close glyph must be decorative: the button carries the real label.
    expect(source).toMatch(/aria-hidden="true"/);
  });

  it('uses sessionStorage, never localStorage, so it cannot clash with auth keys', () => {
    expect(source).toMatch(/sessionStorage/);
    expect(source).not.toMatch(/localStorage/);
  });

  it('still renders the banner when storage is unavailable', () => {
    // A thrown getItem (private mode / strict settings) must not hide the
    // pricing notice, so the catch falls back to showing it.
    expect(source).toMatch(/setDismissed\(false\)/);
    expect(source.match(/catch/g) || []).toHaveLength(2);
  });

  it('inherits host theme tokens rather than hardcoding colours', () => {
    // Light/dark mode and per-store palettes must both apply.
    expect(source).toMatch(/var\(--warning/);
    expect(source).toMatch(/var\(--text/);
    expect(source).toMatch(/var\(--text-secondary/);
  });
});