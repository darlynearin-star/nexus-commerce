'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  BUILT_IN_TEMPLATES, THEME_COLOR_KEYS, DEFAULT_TEMPLATE_ID,
  normalizeHex, withColorDefaults, isDarkColor,
  type StoreThemeTemplate, type ThemeColors, type ThemeColorKey,
} from '@nexus/shared';
import { LayoutTemplate, Save, Plus, Trash2, RotateCcw, Check, AlertTriangle } from 'lucide-react';

const COLOR_LABELS: Record<ThemeColorKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  bg: 'Background',
  surface: 'Surface',
  text: 'Text',
  accent: 'Accent',
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function TemplateSwatch({ colors }: { colors: ThemeColors }) {
  return (
    <div aria-hidden="true" style={{ width: 76, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: colors.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 9, background: colors.surface, display: 'flex', alignItems: 'center', padding: '0 3px', gap: 2 }}>
        <div style={{ width: 9, height: 3, borderRadius: 2, background: colors.primary }} />
      </div>
      <div style={{ flex: 1, padding: 3, display: 'flex', gap: 2 }}>
        <div style={{ flex: 1, borderRadius: 2, background: colors.surface, borderLeft: `2px solid ${colors.accent}` }} />
        <div style={{ width: 16, borderRadius: 2, background: colors.primary }} />
      </div>
    </div>
  );
}

export default function TemplatesAdminPage() {
  const [templates, setTemplates] = useState<StoreThemeTemplate[]>(BUILT_IN_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const notify = useCallback((ok: boolean, text: string) => {
    setMessage({ ok, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await api.get<any>('/templates');
      const list = Array.isArray(r?.data) ? r.data : [];
      if (list.length) {
        setTemplates(list.map((t: any) => ({
          id: String(t.id),
          name: String(t.name || t.id),
          description: String(t.description || ''),
          defaultColors: withColorDefaults(t.defaultColors),
        })));
      }
    } catch (e: any) {
      notify(false, e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback((id: string, patch: Partial<StoreThemeTemplate>) => {
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const updateColor = useCallback((id: string, key: ThemeColorKey, value: string) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, defaultColors: { ...t.defaultColors, [key]: value } } : t
    ));
  }, []);

  const addTemplate = useCallback(() => {
    let n = templates.length + 1;
    let id = `custom-${n}`;
    while (templates.some(t => t.id === id)) { n += 1; id = `custom-${n}`; }
    setTemplates(prev => [...prev, {
      id,
      name: `Custom ${n}`,
      description: '',
      defaultColors: withColorDefaults(null),
    }]);
    setEditingId(id);
  }, [templates]);

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setEditingId(prev => (prev === id ? null : prev));
  }, []);

  const moveTemplate = useCallback((id: string, dir: -1 | 1) => {
    setTemplates(prev => {
      const i = prev.findIndex(t => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put<any>('/templates', { templates });
      if (r?.data?.length) setTemplates(r.data);
      notify(true, `Saved ${templates.length} template(s). New stores will use these.`);
    } catch (e: any) {
      notify(false, e?.message || 'Failed to save templates');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!confirm('Reset all templates back to the four built-in designs? Stores already created keep their own colours.')) return;
    setSaving(true);
    try {
      const r = await api.post<any>('/templates/reset');
      setTemplates(Array.isArray(r?.data) && r.data.length ? r.data : BUILT_IN_TEMPLATES);
      notify(true, 'Templates reset to built-in defaults');
    } catch (e: any) {
      notify(false, e?.message || 'Failed to reset templates');
    } finally {
      setSaving(false);
    }
  };

  const invalidTemplates = useMemo(
    () => templates.filter(t =>
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id) || !t.name.trim() ||
      THEME_COLOR_KEYS.some(k => !normalizeHex(t.defaultColors[k]))
    ).map(t => t.id),
    [templates]
  );

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading templates...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutTemplate size={22} style={{ color: 'var(--primary)' }} /> Store Templates
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 620 }}>
            These appear in the store creation wizard and the retailer theme editor.
            Changes here affect new stores only - stores already created keep the colours they were given.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={addTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Plus size={15} /> Add template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={resetDefaults} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <RotateCcw size={15} /> Reset to built-in
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || invalidTemplates.length > 0 || templates.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save templates'}
          </button>
        </div>
      </div>

      {message && (
        <div role="status" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: message.ok ? 'rgba(79,157,105,0.12)' : 'rgba(196,78,78,0.12)', color: message.ok ? 'var(--success)' : 'var(--error)', border: `1px solid ${message.ok ? 'var(--success)' : 'var(--error)'}` }}>
          {message.ok ? <Check size={16} /> : <AlertTriangle size={16} />} {message.text}
        </div>
      )}

      {invalidTemplates.length > 0 && (
        <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', background: 'rgba(196,78,78,0.12)', color: 'var(--error)', border: '1px solid var(--error)' }}>
          Fix before saving: {invalidTemplates.join(', ')} - each template needs a lowercase id, a name, and six valid hex colours.
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {templates.map((t, idx) => {
          const expanded = editingId === t.id;
          const invalid = invalidTemplates.includes(t.id);
          const isDark = isDarkColor(t.defaultColors.bg);
          return (
            <div key={t.id} className="card" style={{ padding: '1rem', borderColor: invalid ? 'var(--error)' : undefined }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    aria-label={`Move ${t.name} up`}
                    onClick={() => moveTemplate(t.id, -1)}
                    disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: 'var(--text-secondary)', padding: 0, fontSize: '0.625rem' }}
                  >▲</button>
                  <button
                    aria-label={`Move ${t.name} down`}
                    onClick={() => moveTemplate(t.id, 1)}
                    disabled={idx === templates.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === templates.length - 1 ? 'default' : 'pointer', color: 'var(--text-secondary)', padding: 0, fontSize: '0.625rem' }}
                  >▼</button>
                </div>
                <TemplateSwatch colors={t.defaultColors} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <code style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>{t.id}</code>
                    {t.id === DEFAULT_TEMPLATE_ID && <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>default</span>}
                    <span className="badge" style={{ fontSize: '0.625rem' }}>{isDark ? 'dark' : 'light'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.description || 'No description'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(expanded ? null : t.id)} aria-expanded={expanded}>
                    {expanded ? 'Close' : 'Edit'}
                  </button>
                  {templates.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeTemplate(t.id)} aria-label={`Delete ${t.name}`} style={{ color: 'var(--error)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'grid', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor={`tpl-name-${t.id}`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Name</label>
                      <input
                        id={`tpl-name-${t.id}`}
                        className="input"
                        value={t.name}
                        onChange={e => update(t.id, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`tpl-id-${t.id}`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>ID (lowercase, dashes)</label>
                      <input
                        id={`tpl-id-${t.id}`}
                        className="input"
                        value={t.id}
                        onChange={e => update(t.id, { id: slugify(e.target.value) })}
                        style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`tpl-desc-${t.id}`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Description</label>
                      <input
                        id={`tpl-desc-${t.id}`}
                        className="input"
                        value={t.description}
                        onChange={e => update(t.id, { description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '0.6rem' }}>
                    {THEME_COLOR_KEYS.map(key => {
                      const val = t.defaultColors[key];
                      const bad = !normalizeHex(val);
                      return (
                        <div key={key}>
                          <label htmlFor={`tpl-${key}-${t.id}`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>{COLOR_LABELS[key]}</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              id={`tpl-${key}-${t.id}`}
                              type="color"
                              value={bad ? '#000000' : val}
                              onChange={e => updateColor(t.id, key, e.target.value)}
                              style={{ width: 38, height: 32, padding: 0, border: `1px solid ${bad ? 'var(--error)' : 'var(--border)'}`, borderRadius: '0.35rem', cursor: 'pointer', background: 'transparent', flexShrink: 0 }}
                            />
                            <input
                              aria-label={`${COLOR_LABELS[key]} hex for ${t.name}`}
                              className="input"
                              value={val}
                              spellCheck={false}
                              onChange={e => {
                                const norm = normalizeHex(e.target.value);
                                if (norm) updateColor(t.id, key, norm);
                                else update(t.id, { defaultColors: { ...t.defaultColors, [key]: e.target.value } as ThemeColors });
                              }}
                              style={{ fontFamily: 'monospace', fontSize: '0.75rem', borderColor: bad ? 'var(--error)' : undefined }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    Mode is derived from the background colour: currently <strong>{isDark ? 'dark' : 'light'}</strong>.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No templates. Add at least one before saving.
        </div>
      )}
    </div>
  );
}