import { describe, it, expect, vi, beforeEach } from 'vitest';

// Proxy-based prisma mock (same pattern as subscription-enforcer.test.ts):
// model access returns fresh vi.fn()s that tests override.
const prismaMock = vi.hoisted(() => {
  const model = () =>
    new Proxy(
      {},
      {
        get(t: any, prop: string) {
          if (!(prop in t)) t[prop] = vi.fn().mockResolvedValue(undefined);
          return t[prop];
        },
      },
    );
  const root: any = new Proxy(
    {},
    {
      get(t: any, prop: string) {
        if (!(prop in t)) t[prop] = model();
        return t[prop];
      },
    },
  );
  return root;
});

vi.mock('@nexus/database', () => ({
  default: prismaMock,
  initDatabase: vi.fn().mockResolvedValue(undefined),
  getDbStatus: vi.fn(() => ({ usingFallback: false, activeUrl: 'test', manualSwitch: false })),
  PrismaClient: class PrismaClientMock {},
}));

import { sanitizeTemplates } from '../routes/templates';
import {
  BUILT_IN_TEMPLATES, DEFAULT_THEME_COLORS, CSS_VAR_BY_KEY, THEME_COLOR_KEYS,
  normalizeHex, isValidHex, withColorDefaults, isDarkColor, resolveThemeMode,
  hexToRgb, applyThemeColors, snapshotSiteTheme, restoreSiteTheme,
  DEFAULT_TEMPLATE_ID, type ThemeColors,
} from '@nexus/shared';

beforeEach(() => {
  vi.clearAllMocks();
});

const FULL: ThemeColors = {
  primary: '#D4A843',
  secondary: '#A8822E',
  bg: '#0A0A0A',
  surface: '#141414',
  text: '#FAFAFA',
  accent: '#F0D48A',
};

describe('hex helpers', () => {
  it('accepts 3 and 6 digit hex with or without a leading #', () => {
    for (const good of ['#D4A843', 'D4A843', '#abc', 'abc', '#ABCDEF']) {
      expect(isValidHex(good)).toBe(true);
    }
  });

  it('rejects anything that is not hex', () => {
    for (const bad of ['blue', '#12345', 'rgb(0,0,0)', '', '#GGG', 'red', '1234567']) {
      expect(isValidHex(bad)).toBe(false);
    }
    expect(isValidHex(42)).toBe(false);
    expect(isValidHex(null)).toBe(false);
  });

  it('normalises to a lowercase 6-digit value', () => {
    expect(normalizeHex('#D4A843')).toBe('#d4a843');
    expect(normalizeHex('D4A843')).toBe('#d4a843');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('nope')).toBeNull();
  });

  it('parses rgb triples', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(hexToRgb('#D4A843')).toEqual({ r: 212, g: 168, b: 67 });
    expect(hexToRgb('nope')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});

describe('withColorDefaults', () => {
  it('fills missing keys with the defaults', () => {
    const out = withColorDefaults({ primary: '#123456' });
    expect(out.primary).toBe('#123456');
    expect(out.bg).toBe(DEFAULT_THEME_COLORS.bg);
    for (const k of THEME_COLOR_KEYS) expect(out[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('ignores invalid values instead of persisting them', () => {
    const out = withColorDefaults({ primary: 'not-a-color', bg: '' });
    expect(out.primary).toBe(DEFAULT_THEME_COLORS.primary);
    expect(out.bg).toBe(DEFAULT_THEME_COLORS.bg);
  });

  it('always returns all six keys, even from null', () => {
    expect(Object.keys(withColorDefaults(null)).sort()).toEqual([...THEME_COLOR_KEYS].sort());
  });
});

describe('dark/light is derived from the background', () => {
  it('treats near-black as dark and near-white as light', () => {
    expect(isDarkColor('#0A0A0A')).toBe(true);
    expect(isDarkColor('#FFFFFF')).toBe(false);
    expect(isDarkColor('#F8F6F0')).toBe(false);
    expect(isDarkColor('#000000')).toBe(true);
  });

  it('does not depend on the template id', () => {
    // A "minimal" (normally light) template with a dark background flips dark.
    expect(resolveThemeMode({ ...FULL, bg: '#0A0A0A' })).toBe('dark');
    expect(resolveThemeMode({ ...FULL, bg: '#FFFFFF' })).toBe('light');
  });

  it('falls back to the default background when bg is missing or invalid', () => {
    expect(resolveThemeMode({})).toBe(resolveThemeMode(DEFAULT_THEME_COLORS));
    expect(resolveThemeMode(null)).toBe('dark');
    expect(resolveThemeMode({ bg: 'garbage' })).toBe('dark');
  });
});

describe('CSS variable mapping', () => {
  it('maps secondary to --primary-dark and accent to --primary-light', () => {
    // Regression: the old code wrote --secondary / --accent, which do not
    // exist, so those two swatches silently failed to preview.
    expect(CSS_VAR_BY_KEY.secondary).toBe('--primary-dark');
    expect(CSS_VAR_BY_KEY.accent).toBe('--primary-light');
    expect(CSS_VAR_BY_KEY.primary).toBe('--primary');
    expect(CSS_VAR_BY_KEY.bg).toBe('--bg');
    expect(CSS_VAR_BY_KEY.surface).toBe('--surface');
    expect(CSS_VAR_BY_KEY.text).toBe('--text');
  });

  it('every mapped variable is distinct and none are the raw key names', () => {
    const vars = THEME_COLOR_KEYS.map(k => CSS_VAR_BY_KEY[k]);
    expect(new Set(vars).size).toBe(vars.length);
    expect(vars).not.toContain('--secondary');
    expect(vars).not.toContain('--accent');
  });
});

describe('applyThemeColors / snapshot / restore', () => {
  function makeEl() {
    const props = new Map<string, string>();
    const attrs = new Map<string, string>();
    const el: any = {
      style: {
        setProperty: (n: string, v: string) => { props.set(n, v); },
        removeProperty: (n: string) => { props.delete(n); },
        getPropertyValue: (n: string) => props.get(n) ?? '',
      },
      getAttribute: (n: string) => attrs.get(n) ?? null,
      setAttribute: (n: string, v: string) => { attrs.set(n, v); },
      removeAttribute: (n: string) => { attrs.delete(n); },
      dataset: {} as Record<string, string | undefined>,
    };
    return { el, props, attrs };
  }

  it('writes all six colours to the correct variables', () => {
    const { el, props } = makeEl();
    applyThemeColors(FULL, el);
    expect(props.get('--primary')).toBe('#d4a843');
    expect(props.get('--primary-dark')).toBe('#a8822e');
    expect(props.get('--bg')).toBe('#0a0a0a');
    expect(props.get('--surface')).toBe('#141414');
    expect(props.get('--text')).toBe('#fafafa');
    expect(props.get('--primary-light')).toBe('#f0d48a');
  });

  it('still applies the usable colours when one is invalid', () => {
    const { el, props } = makeEl();
    applyThemeColors({ ...FULL, primary: 'garbage' }, el);
    // invalid key falls back to the default rather than writing junk
    expect(props.get('--primary')).toBe(DEFAULT_THEME_COLORS.primary);
    expect(props.get('--bg')).toBe('#0a0a0a');
  });

  it('restores the exact previous inline state (the create-store leak)', () => {
    const { el, props, attrs } = makeEl();
    props.set('--primary', '#ORIGINAL');
    attrs.set('data-theme', 'light');

    const snap = snapshotSiteTheme(el);
    applyThemeColors(FULL, el);
    el.dataset.storeTheme = 'true';
    expect(props.get('--primary')).toBe('#d4a843');

    delete el.dataset.storeTheme;
    restoreSiteTheme(snap, el);

    expect(props.get('--primary')).toBe('#ORIGINAL');
    expect(el.getAttribute('data-theme')).toBe('light');
    expect(el.dataset.storeTheme).toBeUndefined();
  });

  it('removes variables that had no prior inline value', () => {
    const { el } = makeEl();
    const snap = snapshotSiteTheme(el);
    applyThemeColors(FULL, el);
    restoreSiteTheme(snap, el);
    // The observable contract is getPropertyValue(): an unset inline variable
    // reads back as the empty string, never the colour we previewed.
    expect(el.style.getPropertyValue('--primary')).toBe('');
    expect(el.style.getPropertyValue('--bg')).toBe('');
    expect(el.style.getPropertyValue('--primary-dark')).toBe('');
  });
});

describe('built-in templates', () => {
  it('all use valid, complete, unique-id palettes', () => {
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const ids = new Set<string>();
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.name.length).toBeGreaterThan(0);
      for (const k of THEME_COLOR_KEYS) {
        expect(isValidHex(t.defaultColors[k])).toBe(true);
      }
    }
    expect(ids.has(DEFAULT_TEMPLATE_ID)).toBe(true);
  });
});

describe('sanitizeTemplates', () => {
  const valid = { id: 'elegance', name: 'Elegance', description: 'x', defaultColors: FULL };

  it('accepts a valid list and lowercases ids', () => {
    const { templates, error } = sanitizeTemplates([{ ...valid, id: 'My-Store' }]);
    expect(error).toBeUndefined();
    expect(templates![0].id).toBe('my-store');
  });

  it('expands shorthand hex', () => {
    const { templates } = sanitizeTemplates([{ ...valid, defaultColors: { ...FULL, primary: '#abc' } }]);
    expect(templates![0].defaultColors.primary).toBe('#aabbcc');
  });

  it('rejects non-arrays and empty lists', () => {
    expect(sanitizeTemplates(null).error).toBeTruthy();
    expect(sanitizeTemplates({}).error).toBeTruthy();
    expect(sanitizeTemplates([]).error).toBeTruthy();
  });

  it('rejects bad ids, duplicate ids and blank names', () => {
    expect(sanitizeTemplates([{ ...valid, id: 'Bad Id!' }]).error).toBeTruthy();
    expect(sanitizeTemplates([{ ...valid, id: 'a--b' }]).error).toBeTruthy();
    expect(sanitizeTemplates([valid, valid]).error).toMatch(/duplicate/i);
    expect(sanitizeTemplates([{ ...valid, name: '   ' }]).error).toBeTruthy();
  });

  it('rejects a template with any invalid colour, and names the culprit', () => {
    const bad = sanitizeTemplates([{ ...valid, defaultColors: { ...FULL, accent: 'purple' } }]);
    expect(bad.error).toMatch(/accent/);
    const missing = sanitizeTemplates([{ ...valid, defaultColors: { primary: '#fff' } }]);
    expect(missing.error).toBeTruthy();
  });

  it('truncates an overlong description rather than failing', () => {
    const { templates } = sanitizeTemplates([{ ...valid, description: 'd'.repeat(400) }]);
    expect(templates![0].description.length).toBe(140);
  });

  it('round-trips the built-in templates unchanged', () => {
    const { templates, error } = sanitizeTemplates(BUILT_IN_TEMPLATES);
    expect(error).toBeUndefined();
    expect(templates!.map(t => t.id)).toEqual(BUILT_IN_TEMPLATES.map(t => t.id));
  });
});