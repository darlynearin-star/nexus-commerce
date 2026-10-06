/**
 * Store theme tokens, templates and the single source of truth for how a
 * theme's six colours map onto CSS custom properties.
 *
 * Both the storefront (StoreShell / create-store) and the retailer dashboard
 * (theme editor) consume this module so they cannot drift apart.
 */

export const THEME_COLOR_KEYS = ['primary', 'secondary', 'bg', 'surface', 'text', 'accent'] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export type ThemeColors = Record<ThemeColorKey, string>;

/**
 * Canonical colour-key -> CSS custom property mapping.
 *
 * NOTE: `secondary` and `accent` do NOT map to --secondary / --accent. Those
 * variables do not exist; the design system calls them --primary-dark and
 * --primary-light. Writing the raw key silently does nothing, which is why the
 * live preview used to ignore those two swatches.
 */
export const CSS_VAR_BY_KEY: Record<ThemeColorKey, string> = {
  primary: '--primary',
  secondary: '--primary-dark',
  bg: '--bg',
  surface: '--surface',
  text: '--text',
  accent: '--primary-light',
};

export const CSS_VARS_BY_KEY: readonly string[] = THEME_COLOR_KEYS.map((k) => CSS_VAR_BY_KEY[k]);

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#d4a843',
  secondary: '#a8822e',
  bg: '#0a0a0a',
  surface: '#141414',
  text: '#fafafa',
  accent: '#f0d48a',
};

export interface StoreThemeTemplate {
  id: string;
  name: string;
  description: string;
  defaultColors: ThemeColors;
}

/** Seed content used until an admin saves templates through the API. */
export const BUILT_IN_TEMPLATES: StoreThemeTemplate[] = [
  {
    id: 'elegance',
    name: 'Elegance',
    description: 'Gold accents on dark - timeless luxury',
    defaultColors: { primary: '#d4a843', secondary: '#a8822e', bg: '#0a0a0a', surface: '#141414', text: '#fafafa', accent: '#f0d48a' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean whites, soft grays - modern simplicity',
    defaultColors: { primary: '#2d2d2d', secondary: '#6b6b6b', bg: '#ffffff', surface: '#f8f8f6', text: '#1a1a1a', accent: '#b8b8b8' },
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast red on dark - energetic edge',
    defaultColors: { primary: '#ff4433', secondary: '#cc3322', bg: '#0a0a0a', surface: '#1a1a1a', text: '#fafafa', accent: '#ff6655' },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Earthy greens, warm browns - organic feel',
    defaultColors: { primary: '#5b8c5a', secondary: '#4a7349', bg: '#f8f6f0', surface: '#f0ede4', text: '#2c2c2c', accent: '#7dad7c' },
  },
];

export const DEFAULT_TEMPLATE_ID = 'elegance';

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Minimal structural view of an element's inline style. This package is also
 * consumed by the Node API, which compiles without the DOM lib, so we describe
 * exactly the surface we touch instead of depending on `HTMLElement`.
 */
export interface ThemeStyleTarget {
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void; getPropertyValue(name: string): string };
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
  dataset: Record<string, string | undefined>;
}

function defaultTarget(): ThemeStyleTarget | null {
  // `globalThis` rather than a bare `document` reference: this file also
  // compiles in the Node API package, which has no DOM lib.
  const g = globalThis as { document?: { documentElement?: unknown } };
  return (g.document?.documentElement as ThemeStyleTarget | undefined) ?? null;
}

/** True for #abc / #aabbcc (leading # optional). */
export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

/**
 * Normalises user input to a 6-digit `#rrggbb`, or returns null when the value
 * is not a hex colour. Keeps the typed value usable as a live-preview colour.
 */
export function normalizeHex(value: string): string | null {
  const raw = (value || '').trim();
  const m = HEX_RE.exec(raw);
  if (!m) return null;
  const hex = m[1];
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return `#${full.toLowerCase()}`;
}

/**
 * Accepts theme colours as an object OR a JSON string.
 *
 * `StoreTheme.colors` is a Prisma `Json` column, but this codebase writes it
 * with an explicit `JSON.stringify(...)`, so it can come back from the API as a
 * raw string. Reading `str[key]` off a string yields `undefined` for every key,
 * which silently made `withColorDefaults` substitute the built-in palette.
 */
function coerceColors(colors: unknown): Partial<ThemeColors> {
  if (!colors) return {};
  if (typeof colors === 'string') {
    try {
      const parsed = JSON.parse(colors);
      return parsed && typeof parsed === 'object' ? (parsed as Partial<ThemeColors>) : {};
    } catch {
      return {};
    }
  }
  return typeof colors === 'object' ? (colors as Partial<ThemeColors>) : {};
}

/**
 * Fills in any missing/blank colour with the default so a theme is always
 * complete. Every returned value is a lowercase 6-digit hex, which is the
 * format `<input type="color">` requires - uppercase or 3-digit values make
 * the native picker fall back to black.
 */
export function withColorDefaults(colors: Partial<ThemeColors> | string | null | undefined): ThemeColors {
  const source = coerceColors(colors);
  const out = {} as ThemeColors;
  for (const key of THEME_COLOR_KEYS) {
    const v = source[key];
    const norm = typeof v === 'string' ? normalizeHex(v) : null;
    out[key] = norm || normalizeHex(DEFAULT_THEME_COLORS[key]) || '#000000';
  }
  return out;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

/**
 * Dark/light is derived from the chosen background instead of the template id,
 * so a retailer can start from "Minimal" and still pick a near-black background
 * without getting locked into light mode with unreadable text.
 */
export function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness < 128;
}

export function resolveThemeMode(colors: Partial<ThemeColors> | null | undefined): 'dark' | 'light' {
  return isDarkColor(colors?.bg || DEFAULT_THEME_COLORS.bg) ? 'dark' : 'light';
}

/**
 * Writes all six theme colours onto an element (defaults to documentElement).
 * Invalid or missing values are skipped so one bad field cannot blank a theme.
 */
export function applyThemeColors(colors: Partial<ThemeColors> | null | undefined, el?: ThemeStyleTarget): void {
  const target = el || defaultTarget();
  if (!target) return;
  const complete = withColorDefaults(colors);
  for (const key of THEME_COLOR_KEYS) {
    target.style.setProperty(CSS_VAR_BY_KEY[key], complete[key]);
  }
}

export interface SiteThemeSnapshot {
  dataTheme: string | null;
  storeTheme: string | undefined;
  vars: Record<string, string>;
}

/**
 * Captures the site theme so a temporary preview (e.g. the create-store colour
 * step) can be undone on unmount instead of leaking into the rest of the app.
 */
export function snapshotSiteTheme(el?: ThemeStyleTarget): SiteThemeSnapshot {
  const target = el || defaultTarget();
  if (!target) return { dataTheme: null, storeTheme: undefined, vars: {} };
  const vars: Record<string, string> = {};
  for (const v of CSS_VARS_BY_KEY) vars[v] = target.style.getPropertyValue(v);
  return {
    dataTheme: target.getAttribute('data-theme'),
    storeTheme: target.dataset.storeTheme,
    vars,
  };
}

export function restoreSiteTheme(snap: SiteThemeSnapshot, el?: ThemeStyleTarget): void {
  const target = el || defaultTarget();
  if (!target) return;
  for (const v of CSS_VARS_BY_KEY) {
    const val = snap.vars[v];
    if (val) target.style.setProperty(v, val);
    else target.style.removeProperty(v);
  }
  if (snap.dataTheme) target.setAttribute('data-theme', snap.dataTheme);
  else target.removeAttribute('data-theme');
  if (snap.storeTheme) target.dataset.storeTheme = snap.storeTheme;
  else delete target.dataset.storeTheme;
}