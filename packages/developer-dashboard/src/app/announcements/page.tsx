'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Plus, X, Check, AlertTriangle, Info, Calendar, Mail, FileText } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  incident: 'Incidents & Outages',
  subscription: 'Subscriptions & Billing',
  payments: 'Payments',
  platform: 'Platform & Features',
  security: 'Security',
  operations: 'Operations',
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO', priority: 'NORMAL', startsAt: '', endsAt: '', active: true, recipients: '', sendEmail: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState('');

  useEffect(() => { load(); loadTemplates(); }, []);

  const load = async () => { try { const r: any = await api.get('/announcements/all'); setAnnouncements(r.data || []); } catch (e: any) { console.error('Failed:', e); } };

  const loadTemplates = async () => { try { const r: any = await api.get('/announcements/templates'); setTemplates(r.data || []); } catch (e: any) { console.error('Failed:', e); } };

  const useTemplate = (t: any) => {
    setForm(p => ({
      ...p,
      title: t.title, message: t.message,
      type: t.type === 'IMPORTANT' ? 'ALERT' : t.type,
      priority: t.priority === 'CRITICAL' ? 'URGENT' : t.priority,
    }));
    setEditingId(null);
    setShowForm(true);
  };

  const resetForm = () => setForm({ title: '', message: '', type: 'INFO', priority: 'NORMAL', startsAt: '', endsAt: '', active: true, recipients: '', sendEmail: false });

  const save = async () => {
    setEmailMsg('');
    try {
      const body: any = {
        title: form.title, message: form.message, type: form.type, priority: form.priority,
        startsAt: form.startsAt, endsAt: form.endsAt, active: form.active,
        recipients: form.recipients,
      };
      if (editingId) { body.sendEmail = form.sendEmail; await api.put(`/announcements/${editingId}`, body); }
      else { const r: any = await api.post('/announcements', body); setEmailMsg(formatEmailResults(r.emailResults)); }
      setShowForm(false); setEditingId(null); setForm({ title: '', message: '', type: 'INFO', priority: 'NORMAL', startsAt: '', endsAt: '', active: true, recipients: '', sendEmail: false });
      load();
    } catch (e: any) { console.error('Failed:', e); }
  };

  const formatEmailResults = (results: any[] | undefined) => {
    if (!results || results.length === 0) return '';
    const ok = results.filter(r => r.success).length;
    return ok === results.length ? `Emailed ${results.length} recipient(s)` : `Emails: ${ok}/${results.length} sent (${results.filter(r => !r.success).map(r => r.message).join('; ')})`;
  };

  const remove = async (id: string) => { try { await api.delete(`/announcements/${id}`); load(); } catch (e: any) { console.error('Failed:', e); } };

  const edit = (a: any) => { setForm({ title: a.title, message: a.message, type: a.type, priority: a.priority, startsAt: a.startsAt || '', endsAt: a.endsAt || '', active: a.active, recipients: (a.recipients || []).join(', '), sendEmail: false }); setEditingId(a.id); setShowForm(true); };

  const toggleActive = async (a: any) => { try { await api.put(`/announcements/${a.id}`, { active: !a.active }); load(); } catch (e: any) { console.error('Failed:', e); } };

  const typeColors: Record<string, string> = { INFO: 'var(--primary)', WARNING: '#f59e0b', ALERT: '#ef4444', MAINTENANCE: '#8b5cf6' };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Platform Announcements</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Broadcast messages to all platform users</p></div>
        {!showForm && <button className="btn btn-primary" onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }}><Plus size={16} /> New Announcement</button>}
      </div>

      {!showForm && (
        <div style={{ marginBottom: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowTemplates(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> {showTemplates ? 'Hide' : 'Show'} Common Templates
          </button>
          {showTemplates && (
            <div className="card" style={{ marginTop: '1rem', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Pre-written announcements for situations this platform actually faces. Click a template to pre-fill the form, then replace the {"{tokens}"} (e.g. {"{date}"}, {"{merchantCode}"}) with real values before publishing.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.entries(
                  templates.reduce<Record<string, any[]>>((acc, t) => { (acc[t.category] = acc[t.category] || []).push(t); return acc; }, {}),
                ).map(([category, items]) => (
                  <div key={category}>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{CATEGORY_LABELS[category] || category}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {items.map(t => (
                        <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.audience}</p>
                          {t.tokens.length > 0 && <p style={{ fontSize: '0.6875rem', color: 'var(--primary)' }}>Tokens: {t.tokens.join(', ')}</p>}
                          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => useTemplate(t)}>Use Template</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><h3 style={{ fontWeight: 600 }}>{editingId ? 'Edit' : 'New'} Announcement</h3><button className="btn btn-ghost btn-icon" onClick={() => { setShowForm(false); setEditingId(null); }} aria-label="Close"><X size={18} /></button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label htmlFor="announcementTitle" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Title</label><input id="announcementTitle" className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Scheduled Maintenance" /></div>
            <div><label htmlFor="announcementMessage" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Message</label><textarea id="announcementMessage" className="input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} placeholder="Details of the announcement" /></div>
            <div><label htmlFor="announcementRecipients" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Email to (optional, comma-separated)</label><input id="announcementRecipients" className="input" value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} placeholder="owner@example.com, partner@example.com" /><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Leave empty for a global banner only. Emails are sent when the announcement is created.</span></div>
            {editingId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={form.sendEmail} onChange={e => setForm(p => ({ ...p, sendEmail: e.target.checked }))} id="sendEmail" /><label htmlFor="sendEmail" style={{ fontSize: '0.875rem' }}>Re-send email to the listed recipients on save</label></div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label htmlFor="announcementType" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Type</label>
                <select id="announcementType" className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option value="INFO">Info</option><option value="WARNING">Warning</option><option value="ALERT">Alert</option><option value="MAINTENANCE">Maintenance</option></select></div>
              <div><label htmlFor="announcementPriority" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Priority</label>
                <select id="announcementPriority" className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label htmlFor="announcementStartsAt" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Starts At</label>
                <input id="announcementStartsAt" className="input" type="datetime-local" value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))} /></div>
              <div><label htmlFor="announcementEndsAt" style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Ends At</label>
                <input id="announcementEndsAt" className="input" type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} id="active" /><label htmlFor="active" style={{ fontSize: '0.875rem' }}>Active</label></div>
            {emailMsg && <p style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>{emailMsg}</p>}
            <button className="btn btn-primary" onClick={save} disabled={!form.title || !form.message}>Save Announcement</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {announcements.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No announcements yet</p> :
          announcements.map(a => (
            <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: a.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: `${typeColors[a.type] || typeColors.INFO}15`, color: typeColors[a.type] || typeColors.INFO }}>
                  {a.type === 'ALERT' ? <AlertTriangle size={20} /> : a.type === 'MAINTENANCE' ? <Calendar size={20} /> : <Megaphone size={20} />}
                </div>
                <div><p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{a.title}<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', textTransform: 'uppercase' }}>{a.type}</span></p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.message}</p>
                  {a.recipients?.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}><Mail size={12} style={{ verticalAlign: 'middle' }} /> Emailed to: {a.recipients.join(', ')}</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>By {a.createdBy?.slice(0, 8)} | {new Date(a.createdAt).toLocaleDateString()}</p></div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(a)} aria-label={a.active ? 'Deactivate announcement' : 'Activate announcement'}>{a.active ? <Check size={16} /> : <X size={16} />}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => edit(a)}>Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => remove(a.id)}>Delete</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
