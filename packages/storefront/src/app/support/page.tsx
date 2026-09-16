'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const KIND_CHIPS = [
  { id: 'Suggestion', label: 'Suggestion', icon: <Lightbulb size={16} /> },
  { id: 'Bug', label: 'Bug', icon: <Bug size={16} /> },
  { id: 'Question', label: 'Question', icon: <HelpCircle size={16} /> },
  { id: 'Other', label: 'Other', icon: <AlertCircle size={16} /> },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#f59e0b' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  CLOSED: { label: 'Closed', color: '#6b7280' },
};

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('Suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<any>('/support').then(r => setTickets(r.data || [])).catch(() => setError('Could not load your messages. Try again.')).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [tickets]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '3rem 0', maxWidth: 720, textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Chat with Lyn-nyx</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Suggestions, bug reports and questions — answerable by us whenever we are free.</p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>Sign in to start a chat</Link>
      </div>
    );
  }

  async function sendMessage() {
    const description = body.trim();
    const finalSubject = subject.trim() ? `[${kind}] ${subject.trim()}` : `[${kind}]`;
    if (!description) { setError('Tell us what is on your mind.'); return; }
    setError(''); setSending(true);
    try {
      const created: any = await api.post('/support', { subject: finalSubject, description });
      setTickets(t => [created.data, ...t]);
      setBody(''); setSubject('');
    } catch (e: any) {
      setError(e?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function reply(ticketId: string, message: string) {
    if (!message.trim()) return;
    await api.post(`/support/${ticketId}/messages`, { message });
    setTickets(t => t.map(tk => tk.id === ticketId ? { ...tk, messages: [...tk.messages, { id: `x${Date.now()}`, userId: (user as any).id, message, createdAt: new Date().toISOString(), sender: `${user!.firstName} ${user!.lastName}`, role: (user as any).role }] } : tk));
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Chat with Lyn-nyx</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Got an idea, spotted a bug, or stuck on something? Start a chat below.</p>

      <div style={{ borderRadius: 16, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', padding: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {KIND_CHIPS.map(c => (
            <button key={c.id} onClick={() => setKind(c.id)} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: kind === c.id ? 'var(--primary)' : 'transparent', color: kind === c.id ? 'var(--bg)' : 'var(--text-primary)', border: `1px solid ${kind === c.id ? 'var(--primary)' : 'var(--border)'}` }}>{c.icon} {c.label}</button>
          ))}
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Short title${kind === 'Bug' ? ' (e.g. "Checkout button does nothing")' : ''}`} maxLength={120} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', marginBottom: '0.5rem', background: 'var(--bg-input, #fff)', fontSize: '0.9375rem' }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={kind === 'Bug' ? 'What went wrong? What did you expect instead?' : 'Tell us more...'} rows={4} maxLength={5000} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', resize: 'vertical', background: 'var(--bg-input, #fff)', fontSize: '0.9375rem' }} />
        {error && <p style={{ color: 'var(--error, #dc2626)', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>{error}</p>}
        <button onClick={sendMessage} disabled={sending || !body.trim()} className="btn btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Send size={16} /> {sending ? 'Sending...' : 'Send message'}
        </button>
      </div>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Your chats</h2>
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {!loading && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', borderRadius: 16, border: '1px dashed var(--border)' }}>
          <MessageSquare size={36} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
          <p>No chats yet — send your first message above.</p>
        </div>
      )}
      {tickets.map(ticket => (
        <ThreadCard key={ticket.id} ticket={ticket} me={user!.id} onReply={(m: string) => reply(ticket.id, m)} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function ThreadCard({ ticket, me, onReply }: { ticket: any; me: string; onReply: (m: string) => void }) {
  const [draft, setDraft] = useState('');
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.OPEN;
  return (
    <div style={{ borderRadius: 16, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle, #f8f8f8)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', wordBreak: 'break-word' }}>{ticket.subject}</div>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: status.color, borderRadius: 999, border: `1px solid ${status.color}40`, padding: '0.2rem 0.6rem' }}>
          {status.label === 'Open' ? <AlertCircle size={12} /> : status.label === 'Resolved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
        </span>
      </div>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 360, overflowY: 'auto' }}>
        {ticket.messages.map((m: any) => {
          const mine = m.userId === me;
          const sender = mine ? 'You' : (m.sender || 'Lyn-nyx');
          const initial = (sender[0] || '?').toUpperCase();
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.18rem', maxWidth: '100%' }}>
                {!mine && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--silver)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 600, fontSize: '0.625rem', flexShrink: 0 }}>{initial}</div>}
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender}</span>
              </div>
              <div style={{ maxWidth: '82%', borderRadius: 12, borderTopRightRadius: mine ? 4 : 12, borderTopLeftRadius: mine ? 12 : 4, padding: '0.55rem 0.8rem', background: mine ? 'var(--primary)' : 'var(--bg-subtle, #f1f1f1)', color: mine ? 'var(--bg)' : 'var(--text-primary)', border: mine ? 'none' : '1px solid var(--border)' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.45 }}>{m.message}</div>
                <div style={{ fontSize: '0.6875rem', opacity: 0.75, marginTop: '0.25rem' }}>{new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onReply(draft); setDraft(''); } }} placeholder="Reply to this chat..." maxLength={5000} style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input, #fff)', fontSize: '0.875rem' }} />
        <button onClick={() => { onReply(draft); setDraft(''); }} disabled={!draft.trim()} className="btn btn-primary btn-sm">Send</button>
      </div>
    </div>
  );
}