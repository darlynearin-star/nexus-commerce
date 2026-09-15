'use client';
import { useCallback, useEffect, useState } from 'react';
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

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/support')}><ChevronLeft size={16} /> Back to Inbox</button>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card, #fff)' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle, #f7f7f8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{ticket.subject}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{senderName(ticket)} · {customer.email || '—'} · {new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span className={`badge ${ticket.status === 'RESOLVED' ? 'badge-success' : ticket.status === 'CLOSED' ? '' : 'badge-warning'}`} style={{ color: status.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                {ticket.status === 'OPEN' ? <AlertCircle size={12} /> : ticket.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
              </span>
              {ticket.status !== 'RESOLVED' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus('RESOLVED')}>Mark resolved</button>}
              {ticket.status !== 'CLOSED' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus('CLOSED')}>Close</button>}
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 460, overflowY: 'auto' }}>
          {ticket.messages.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: isDevRole(m.role) ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '82%', borderRadius: 12, borderTopRightRadius: isDevRole(m.role) ? 4 : 12, borderTopLeftRadius: isDevRole(m.role) ? 12 : 4, padding: '0.55rem 0.8rem', background: isDevRole(m.role) ? 'var(--primary)' : 'var(--bg-subtle, #f1f1f2)', color: isDevRole(m.role) ? '#fff' : 'inherit' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.45 }}>{m.message}</div>
                <div style={{ fontSize: '0.6875rem', opacity: 0.75, marginTop: '0.25rem' }}>{m.sender || 'Support'} · {new Date(m.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Description:</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{ticket.description}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && reply.trim()) sendReply(); }}
              placeholder="Reply to this ticket..."
              maxLength={5000}
              style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem' }}
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={!reply.trim() || sending} onClick={sendReply}><Send size={14} style={{ marginRight: '0.25rem' }} /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}