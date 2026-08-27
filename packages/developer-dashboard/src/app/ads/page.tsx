'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Video, Play, Copy, Trash2, Check, AlertTriangle, Loader2, Film, Zap, Download } from 'lucide-react';

export default function AdStudioPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'9:16' | '16:9'>('9:16');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<any[]>([]);
  const [caps, setCaps] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const [t, c, r]: any = await Promise.all([
        api.get('/ads/templates').catch(() => ({ data: [] })),
        api.get('/ads/capabilities').catch(() => ({ data: null })),
        api.get('/ads').catch(() => ({ data: [] })),
      ]);
      setTemplates(t.data || []);
      setCaps(c.data || null);
      setRows(r.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const tick = setInterval(() => { api.get('/ads').then((r: any) => setRows(r.data || [])).catch(() => {}); }, 12000);
    return () => clearInterval(tick);
  }, []);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = selected.size === templates.length && templates.length > 0;
  const noneSelected = selected.size === 0;

  const create = async (batch: boolean) => {
    if (!url.trim()) { setMsg('Paste a URL first'); return; }
    const ids = Array.from(selected);
    if (!ids.length) { setMsg('Pick at least one template'); return; }
    setBusy(true); setMsg('');
    try {
      if (batch) await api.post('/ads/batch', { sourceUrl: url, templateIds: ids, format });
      else {
        for (const templateId of ids) await api.post('/ads', { sourceUrl: url, templateId, format });
      }
      setMsg(`Queued ${ids.length} video(s) — they will render in the background.`);
      setSelected(new Set());
      load();
    } catch (e: any) { setMsg(e?.message || 'Failed to queue'); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => { try { await api.delete(`/ads/${id}`); load(); } catch {} };
  const retry = async (id: string) => { try { await api.post(`/ads/${id}/retry`); load(); } catch {} };

  const copyUrl = async (videoUrl: string, id: string) => {
    try { await navigator.clipboard.writeText(videoUrl); setCopyFeedback(p => ({ ...p, [id]: true })); setTimeout(() => setCopyFeedback(p => { const c = { ...p }; delete c[id]; return c; }), 1500); } catch {}
  };

  const statusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DONE') return <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#052e16', color: '#4ade80' }}><Check size={10} style={{ verticalAlign: 'middle' }} /> done</span>;
    if (s === 'RENDERING') return <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#3b2f00', color: '#facc15' }}><Loader2 size={10} className="spin" style={{ verticalAlign: 'middle' }} /> rendering</span>;
    if (s === 'FAILED') return <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#2e0505', color: '#f87171' }}><AlertTriangle size={10} style={{ verticalAlign: 'middle' }} /> failed</span>;
    return <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#1c1914', color: 'var(--text-secondary)' }}>{status.toLowerCase()}</span>;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Film size={22} /> Ad Studio</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Paste any store/product URL and it renders tutorial-style ad videos — one per template.</p></div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: caps ? (caps.ready ? '#4ade80' : '#f87171') : 'var(--text-secondary)', marginBottom: '0.375rem' }}>{caps ? (caps.ready ? 'Ready to render' : 'Incomplete setup') : 'Checking engine…'}</p>
          {caps && <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              { ok: caps.ffmpeg, label: 'ffmpeg' },
              { ok: caps.font, label: 'captions' },
              { ok: caps.playwright, label: 'screenshot' },
              { ok: caps.elevenlabs, label: 'voiceover' },
            ].map(c => (
              <span key={c.label} style={{ fontSize: '0.625rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: c.ok ? '#052e16' : '#2e0505', color: c.ok ? '#4ade80' : '#f87171' }}>{c.ok ? '✓' : '✗'} {c.label}</span>
            ))}
          </div>}
          {caps?.hint && <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.375rem', maxWidth: 300, marginLeft: 'auto' }}>{caps.hint}</p>}
        </div>
      </div>

      {msg && <p style={{ fontSize: '0.875rem', color: msg.includes('Queued') ? '#4ade80' : '#f87171', marginBottom: '1rem' }}>{msg}</p>}

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <label htmlFor="adUrl" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.25rem' }}>Website link</label>
        <input id="adUrl" className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://nexus-storefront-dusky.vercel.app/store/adorn" style={{ fontFamily: 'monospace' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Any storefront / store / product page. The renderer captures a screenshot of it for the middle section.</span>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" value={format} onChange={e => setFormat(e.target.value as any)} style={{ width: 'auto' }}>
            <option value="9:16">9:16 Portrait (reels / TikTok)</option>
            <option value="16:9">16:9 Landscape (YouTube)</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(allSelected ? new Set() : new Set(templates.map(t => t.id)))}>{allSelected ? 'Deselect all' : 'Select all'} ({templates.length})</button>
          <button className="btn btn-primary" onClick={() => create(true)} disabled={busy || noneSelected || !url.trim()} style={{ marginLeft: 'auto' }}>{busy ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Generate {selected.size || ''} video{selected.size === 1 ? '' : 's'}</button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem' }}>Templates — each one becomes a separate video</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Every template is a short storyboard (3–4 beats, 13–14s) with brass captions and your paste-URL screenshot in the middle. Voiceover is from your ElevenLabs key.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {templates.map(t => (
            <label key={t.id} style={{ display: 'flex', gap: '0.5rem', border: `1px solid ${selected.has(t.id) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} style={{ marginTop: '0.125rem' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.summary}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--primary)', marginTop: '0.25rem' }}>{t.formats.join(' · ')}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Video size={16} /> Recent videos</h3>
        {rows.length === 0 && (
          <div className="skeleton" style={{ height: 80, borderRadius: '0.5rem' }} />
        )}
        {rows.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Nothing yet. Generate one above.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map(r => (
            <div key={r.id} className="card" style={{ padding: '0.75rem', opacity: r.status === 'FAILED' ? 0.85 : 1, borderLeft: `3px solid ${r.status === 'DONE' ? '#4ade80' : r.status === 'FAILED' ? '#f87171' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>{r.templateId} · {r.format} {statusBadge(r.status)} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{r.sourceUrl}</span></p>
                  {r.error && <p style={{ fontSize: '0.75rem', color: '#f87171' }}>{r.error}</p>}
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  {r.status === 'DONE' && r.videoUrl && <>
                    <a href={r.videoUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ gap: '0.25rem' }}><Play size={14} /> Open</a>
                    <a href={r.videoUrl} download className="btn btn-ghost btn-sm" style={{ gap: '0.25rem' }}><Download size={14} /> MP4</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => copyUrl(r.videoUrl, r.id)}>{copyFeedback[r.id] ? <Check size={14} /> : <Copy size={14} />} {copyFeedback[r.id] ? 'Copied' : 'Copy link'}</button>
                  </>}
                  {r.status === 'FAILED' && <button className="btn btn-ghost btn-sm" onClick={() => retry(r.id)}>Retry</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(r.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
              {r.status === 'DONE' && r.videoUrl && (
                <video key={r.videoUrl} src={r.videoUrl} controls preload="metadata" style={{ width: '100%', maxWidth: 280, maxHeight: 168, borderRadius: '0.5rem', marginTop: '0.75rem', background: '#000' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
