'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  BUILT_IN_TEMPLATES, THEME_COLOR_KEYS, DEFAULT_THEME_COLORS,
  applyThemeColors, snapshotSiteTheme, restoreSiteTheme, resolveThemeMode,
  normalizeHex, withColorDefaults,
  type StoreThemeTemplate, type ThemeColors, type ThemeColorKey,
} from '@nexus/shared';
import { Palette, Save, Check, AlertTriangle, RotateCcw, ExternalLink } from 'lucide-react';

const COLOR_LABELS: Record<ThemeColorKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  bg: 'Background',
  surface: 'Surface',
  text: 'Text',
  accent: 'Accent',
};

const COLOR_HINTS: Record<ThemeColorKey, string> = {
  primary: 'Buttons, links and highlights',
  secondary: 'Hover and pressed button states',
  bg: 'Page background. Also decides light or dark mode.',
  surface: 'Cards and panels',
  text: 'Body text',
  accent: 'Subtle highlights and gradients',
};

export default function ThemeEditorPage() {
  const [templates, setTemplates] = useState<StoreThemeTemplate[]>(BUILT_IN_TEMPLATES);
  const [templateId, setTemplateId] = useState<string>('');
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [hexDrafts, setHexDrafts] = useState<Partial<Record<ThemeColorKey, string>>>({});
  const [storeId, setStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const themeMode = useMemo(() => resolveThemeMode(colors), [colors]);

  const invalidHexKeys = useMemo(
    () => THEME_COLOR_KEYS.filter(k => {
      const d = hexDrafts[k];
      return d !== undefined && d.trim() !== '' && !normalizeHex(d);
    }),
    [hexDrafts]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<any>('/stores/mine'),
      api.get<any>('/templates').catch(() => ({ data: null })),
    ]).then(([storeRes, tplRes]: [any, any]) => {
      if (cancelled) return;
      const store = storeRes?.data;
      setStoreId(store?.id || '');
      setStoreName(store?.name || '');
      // Persisted colours win over the template's defaults.
      setColors(withColorDefaults(store?.theme?.colors));
      setTemplateId(store?.theme?.template || '');
      const list = Array.isArray(tplRes?.data) && tplRes.data.length ? tplRes.data : null;
      if (list) {
        setTemplates(list.map((t: any) => ({
          id: String(t.id),
          name: String(t.name || t.id),
          description: String(t.description || ''),
          defaultColors: withColorDefaults(t.defaultColors),
        })));
      }
    }).catch((e: any) => {
      if (!cancelled) setMessage({ ok: false, text: e?.message || 'Failed to load your store' });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The preview is scoped to its own element, so this never touches the
  // dashboard's own chrome the way the old create-store page did.
  useEffect(() => {
    if (!previewRef.current) return;
    applyThemeColors(colors, previewRef.current);
  }, [colors]);

  const pickTemplate = useCallback((t: StoreThemeTemplate) => {
    setTemplateId(t.id);
    setColors(withColorDefaults(t.defaultColors));
    setHexDrafts({});
  }, []);

  const setColor = useCallback((key: ThemeColorKey, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  }, []);

  const commitHex = useCallback((key: ThemeColorKey, raw: string) => {
    setHexDrafts(prev => ({ ...prev, [key]: raw }));
    const norm = normalizeHex(raw);
    if (norm) setColor(key, norm);
  }, [setColor]);

  const resetToTemplate = useCallback(() => {
    const t = templates.find(x => x.id === templateId) || templates[0];
    if (t) pickTemplate(t);
  }, [templates, templateId, pickTemplate]);

  const save = async () => {
    if (!storeId || invalidHexKeys.length > 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/stores/${storeId}`, {
        theme: { template: templateId || undefined, colors: withColorDefaults(colors) },
      });
      setMessage({ ok: true, text: 'Theme saved. Your storefront updates immediately.' });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || 'Failed to save theme' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading theme...</div>;

  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
  const slug = typeof window !== 'undefined' ? localStorage.getItem('activeStoreSlug') : null;
  const dirty = JSON.stringify(withColorDefaults(colors)) !== JSON.stringify(colors) || invalidHexKeys.length > 0;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={22} style={{ color: 'var(--primary)' }} /> Store Theme
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Change how {storeName || 'your store'} looks. Updates go live as soon as you save.
          </p>
        </div>
        {slug && (
          <a
            href={`${storefrontUrl}/store/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <ExternalLink size={14} /> View live store
          </a>
        )}
      </div>

      {message && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem',
            background: message.ok ? 'rgba(79,157,105,0.12)' : 'rgba(196,78,78,0.12)',
            color: message.ok ? 'var(--success)' : 'var(--error)',
            border: `1px solid ${message.ok ? 'var(--success)' : 'var(--error)'}`,
          }}
        >
          {message.ok ? <Check size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* ---------------- Controls ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Template</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Pick a starting point, then tweak any colour below.
            </p>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {templates.map(t => {
                const c = withColorDefaults(t.defaultColors);
                const selected = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t)}
                    aria-pressed={selected}
                    style={{
                      display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem',
                      borderRadius: '0.5rem', textAlign: 'left', width: '100%', cursor: 'pointer',
                      border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div aria-hidden="true" style={{ width: 56, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: c.bg, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ height: 7, background: c.surface }} />
                      <div style={{ flex: 1, display: 'flex', gap: 2, padding: 2 }}>
                        <div style={{ flex: 1, background: c.surface, borderLeft: `2px solid ${c.accent}` }} />
                        <div style={{ width: 12, background: c.primary }} />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {THEME_COLOR_KEYS.map(k => (
                        <span key={k} title={`${COLOR_LABELS[k]} ${c[k]}`} style={{ width: 11, height: 11, borderRadius: 3, background: c[k], border: '1px solid rgba(128,128,128,0.35)' }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            {templates.length === 0 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No templates available. Colours can still be edited below.</p>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Colours</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Your background colour automatically sets {themeMode === 'dark' ? 'dark' : 'light'} mode.
            </p>

            {invalidHexKeys.length > 0 && (
              <div role="alert" style={{ padding: '0.6rem 0.75rem', borderRadius: '0.4rem', marginBottom: '0.85rem', background: 'rgba(196,78,78,0.12)', border: '1px solid var(--error)', color: 'var(--error)', fontSize: '0.8125rem' }}>
                Not a valid hex colour: {invalidHexKeys.map(k => COLOR_LABELS[k]).join(', ')}. Use 3 or 6 hex digits, e.g. #D4A843.
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {THEME_COLOR_KEYS.map(key => {
                const val = colors[key];
                const draft = hexDrafts[key] ?? val;
                const invalid = draft.trim() !== '' && !normalizeHex(draft);
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <label htmlFor={`theme-${key}`} style={{ width: 84, flexShrink: 0, fontSize: '0.8125rem', fontWeight: 500 }}>{COLOR_LABELS[key]}</label>
                      <input
                        id={`theme-${key}`}
                        type="color"
                        value={val}
                        onChange={e => { setColor(key, e.target.value); setHexDrafts(p => ({ ...p, [key]: e.target.value })); }}
                        style={{ width: 42, height: 34, padding: 0, border: `1px solid ${invalid ? 'var(--error)' : 'var(--border)'}`, borderRadius: '0.35rem', cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                      />
                      <input
                        aria-label={`${COLOR_LABELS[key]} hex value`}
                        type="text"
                        value={draft}
                        spellCheck={false}
                        onChange={e => commitHex(key, e.target.value)}
                        onBlur={() => setHexDrafts(p => ({ ...p, [key]: undefined }))}
                        className="input"
                        style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem', borderColor: invalid ? 'var(--error)' : undefined }}
                      />
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 84px' }}>{COLOR_HINTS[key]}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={save} disabled={saving || invalidHexKeys.length > 0 || !storeId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save theme'}
              </button>
              <button className="btn btn-secondary" onClick={resetToTemplate} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <RotateCcw size={15} /> Reset to template
              </button>
              {dirty && <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'var(--warning)' }}>Unsaved changes</span>}
            </div>
          </div>
        </div>

        {/* ---------------- Live preview ---------------- */}
        <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Preview</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Exactly how your storefront will look.
          </p>
          {/* Scoped preview: theme vars are written to this node only, so the
              dashboard chrome keeps its own colours. */}
          <div ref={previewRef} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: 34, background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 0.75rem', gap: '0.6rem' }}>
              <span style={{ width: 15, height: 15, borderRadius: 4, background: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{storeName || 'Your Store'}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text)', opacity: 0.7 }}>Shop&nbsp;&nbsp;Cart</span>
            </div>
            <div style={{ background: 'var(--bg)', padding: '1.25rem' }}>
              <div style={{ height: 9, width: '50%', borderRadius: 4, background: 'var(--text)', opacity: 0.85, marginBottom: '0.5rem' }} />
              <div style={{ height: 6, width: '70%', borderRadius: 3, background: 'var(--text)', opacity: 0.4, marginBottom: '0.9rem' }} />
              <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--bg)', background: 'var(--primary)', padding: '0.35rem 0.875rem', borderRadius: 999 }}>Shop now</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.9rem' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ background: 'var(--surface)', borderRadius: 6, padding: '0.5rem', borderLeft: `2px solid ${i === 1 ? 'var(--accent)' : 'transparent'}` }}>
                    <div style={{ height: 5, width: '70%', borderRadius: 3, background: 'var(--text)', opacity: 0.5, marginBottom: 4 }} />
                    <div style={{ height: 5, width: '40%', borderRadius: 3, background: 'var(--primary)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Mode: <strong style={{ color: 'var(--text)' }}>{themeMode === 'dark' ? 'Dark' : 'Light'}</strong> (derived from your background colour)
          </p>
        </div>
      </div>
    </div>
  );
}