'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Send, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#f59e0b' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  CLOSED: { label: 'Closed', color: '#6b7280' },
};

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'DEVELOPER' && user.role !== 'SUPER_DEVELOPER') { router.push('/login'); return; }
    load(filter);
  }, [user]);

  function load(status = filter) {
    api.get<any>('/admin/support/tickets', status ? { status } : {}).then(r => setTickets(r.data || [])).finally(() => setLoading(false));
  }

  async function setStatus(id: string, status: string) {
    await api.put(`/admin/support/tickets/${id}`, { status });
    load(filter);
  }

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Support Inbox</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Messages from users — suggestions, bug reports and questions.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['', 'OPEN', 'RESOLVED', 'CLOSED'].map(s => (
          <button key={s} onClick={() => { setFilter(s); load(s); }} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} style={{ textTransform: s ? 'capitalize' : 'none' }}>{s ? STATUS_LABELS[s].label : 'All'}</button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading tickets...</p>}
      {!loading && tickets.length === 0 && <p style={{ color: 'var(--text-secondary)', padding: '2rem 0', textAlign: 'center' }}>No tickets here yet.</p>}

      {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} onStatus={(s: string) => setStatus(ticket.id, s)} />)}
    </div>
  );
}

function TicketCard({ ticket, onStatus }: { ticket: any; onStatus: (s: string) => void }) {
  const [reply, setReply] = useState('');
  const sending = false;
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.OPEN;
  const customer = ticket.customer?.user || {};
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem', overflow: 'hidden', background: 'var(--bg-card, #fff)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle, #f7f7f8)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{ticket.subject}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{customer.firstName} {customer.lastName} · {customer.email || '—'} · {new Date(ticket.createdAt).toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span className={`badge ${ticket.status === 'RESOLVED' ? 'badge-success' : ticket.status === 'CLOSED' ? '' : 'badge-warning'}`} style={{ color: status.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            {ticket.status === 'OPEN' ? <AlertCircle size={12} /> : ticket.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
          </span>
          {ticket.status !== 'RESOLVED' && <button className="btn btn-ghost btn-sm" onClick={() => onStatus('RESOLVED')}>Mark resolved</button>}
          {ticket.status !== 'CLOSED' && <button className="btn btn-ghost btn-sm" onClick={() => onStatus('CLOSED')}>Close</button>}
        </div>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 420, overflowY: 'auto' }}>
        {ticket.messages.map((m: any) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'DEVELOPER' || m.role === 'SUPER_DEVELOPER' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '82%', borderRadius: 12, borderTopRightRadius: m.role === 'DEVELOPER' || m.role === 'SUPER_DEVELOPER' ? 4 : 12, borderTopLeftRadius: m.role === 'DEVELOPER' || m.role === 'SUPER_DEVELOPER' ? 12 : 4, padding: '0.55rem 0.8rem', background: m.role === 'DEVELOPER' || m.role === 'SUPER_DEVELOPER' ? 'var(--primary)' : 'var(--bg-subtle, #f1f1f2)', color: m.role === 'DEVELOPER' || m.role === 'SUPER_DEVELOPER' ? '#fff' : 'inherit' }}>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.45 }}>{m.message}</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.75, marginTop: '0.25rem' }}>{m.sender || 'Support'} · {new Date(m.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
        <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter' && reply.trim()) { await api.post(`/admin/support/tickets/${ticket.id}/messages`, { message: reply }); setReply(''); window.location.reload(); } }} placeholder="Reply to this ticket..." maxLength={5000} style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem' }} />
        <button type="button" className="btn btn-primary btn-sm" disabled={sending || !reply.trim()} onClick={async () => { await api.post(`/admin/support/tickets/${ticket.id}/messages`, { message: reply }); setReply(''); window.location.reload(); }}><Send size={14} style={{ marginRight: '0.25rem' }} /> Send</button>
      </div>

      <div style={{ padding: '0 1rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description:</div>
      <div style={{ padding: '0 1rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ticket.description}</div>
    </div>
  );
}