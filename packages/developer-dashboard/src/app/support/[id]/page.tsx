'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Send, AlertCircle, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#f59e0b' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  CLOSED: { label: 'Closed', color: '#6b7280' },
};

function isDevRole(role?: string) {
  return role === 'DEVELOPER' || role === 'SUPER_DEVELOPER';
}

function senderName(ticket: any): string {
  const c = ticket.customer?.user || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return name || c.email || 'Unknown';
}

export default function SupportChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    api.get<any>(`/admin/support/tickets/${params.id}`)
      .then(r => setTicket(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'DEVELOPER' && user.role !== 'SUPER_DEVELOPER') { router.push('/login'); return; }
    load();
  }, [user, load]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [ticket?.messages?.length]);

  async function setStatus(status: string) {
    await api.put(`/admin/support/tickets/${ticket.id}`, { status });
    load();
  }

  async function sendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/admin/support/tickets/${ticket.id}/messages`, { message: reply });
      setReply('');
      load();
    } finally {
      setSending(false);
    }
  }

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;
  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading chat...</div>;

  if (notFound || !ticket) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Support Chat</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This conversation could not be found.</p>
        <button className="btn btn-primary btn-sm" onClick={() => router.push('/support')}><ChevronLeft size={16} /> Back to Inbox</button>
      </div>
    );
  }

  const customer = ticket.customer?.user || {};
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.OPEN;
  const initial = (senderName(ticket)[0] || '?').toUpperCase();

  return (
    <div style={{ height: '100vh', boxSizing: 'border-box', padding: '1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--bg-card, #fff)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle, #f7f7f8)', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => router.push('/support')} aria-label="Back to inbox"><ChevronLeft size={20} /></button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.9375rem', flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{senderName(ticket)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.email || '—'} · {ticket.subject}</div>
          </div>
          <span className={`badge ${ticket.status === 'RESOLVED' ? 'badge-success' : ticket.status === 'CLOSED' ? '' : 'badge-warning'}`} style={{ color: status.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            {ticket.status === 'OPEN' ? <AlertCircle size={12} /> : ticket.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
          </span>
          <span style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
            {ticket.status !== 'RESOLVED' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus('RESOLVED')}>Resolve</button>}
            {ticket.status !== 'CLOSED' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus('CLOSED')}>Close</button>}
          </span>
        </div>

        <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-chat, #f6f7f9)' }}>
          {ticket.messages.map((m: any) => {
            const mine = isDevRole(m.role);
            const sender = mine ? 'You' : (m.sender || 'Customer');
            const initial = (sender[0] || '?').toUpperCase();
            const showTime = new Date(m.createdAt).toLocaleString();
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.18rem', maxWidth: '100%' }}>
                  {!mine && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--silver)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 600, fontSize: '0.625rem', flexShrink: 0 }}>{initial}</div>}
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender}</span>
                </div>
                <div style={{ maxWidth: '72%', borderRadius: 14, borderTopRightRadius: mine ? 4 : 14, borderTopLeftRadius: mine ? 14 : 4, padding: '0.55rem 0.8rem', background: mine ? 'var(--primary)' : 'var(--silver-dark)', color: mine ? 'var(--bg)' : 'var(--text)', border: mine ? 'none' : '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.45 }}>{m.message}</div>
                  <div style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: '0.25rem', textAlign: 'right' }}>{showTime}</div>
                </div>
              </div>
            );
          })}
          {ticket.messages.length === 0 && <div style={{ margin: 'auto', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No messages yet.</div>}
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'var(--bg-subtle, #f7f7f8)', flexShrink: 0 }}>
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && reply.trim()) sendReply(); }}
            placeholder="Type a reply..."
            maxLength={5000}
            style={{ flex: 1, padding: '0.55rem 0.9rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.875rem', background: 'var(--bg-card, #fff)' }}
          />
          <button type="button" className="btn btn-primary" disabled={!reply.trim() || sending} onClick={sendReply} style={{ borderRadius: 20, padding: '0.5rem 0.9rem' }}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}