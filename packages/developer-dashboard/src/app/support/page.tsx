'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Send, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, ChevronLeft, Inbox } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#f59e0b' },
  RESOLVED: { label: 'Resolved', color: '#10b981' },
  CLOSED: { label: 'Closed', color: '#6b7280' },
};

const PREVIEW_MESSAGES = 3;

function isDevRole(role?: string) {
  return role === 'DEVELOPER' || role === 'SUPER_DEVELOPER';
}

function lastActivity(ticket: any): number {
  const last = ticket.messages?.[ticket.messages.length - 1];
  return new Date(last?.createdAt || ticket.createdAt).getTime();
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function senderName(ticket: any): string {
  const c = ticket.customer?.user || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return name || c.email || 'Unknown';
}

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  async function sendReply(id: string, message: string) {
    await api.post(`/admin/support/tickets/${id}/messages`, { message });
    load(filter);
  }

  if (!user) return <div style={{ padding: '2rem' }}>Redirecting...</div>;

  const selected = selectedId ? tickets.find(t => t.id === selectedId) || null : null;
  const sorted = [...tickets].sort((a, b) => lastActivity(b) - lastActivity(a));

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Support Inbox</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Messages from users — suggestions, bug reports and questions.</p>

      {selected ? (
        <DetailView ticket={selected} onBack={() => setSelectedId(null)} onStatus={(s: string) => setStatus(selected.id, s)} onReply={(m: string) => sendReply(selected.id, m)} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['', 'OPEN', 'RESOLVED', 'CLOSED'].map(s => (
              <button key={s} onClick={() => { setFilter(s); load(s); }} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} style={{ textTransform: s ? 'capitalize' : 'none' }}>{s ? STATUS_LABELS[s].label : 'All'}</button>
            ))}
          </div>

          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading tickets...</p>}
          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <Inbox size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <div>No tickets here yet.</div>
            </div>
          )}

          {sorted.map(ticket => (
            <InboxRow
              key={ticket.id}
              ticket={ticket}
              expanded={expandedId === ticket.id}
              onToggleExpand={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
              onOpen={() => setSelectedId(ticket.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function InboxRow({ ticket, expanded, onToggleExpand, onOpen }: { ticket: any; expanded: boolean; onToggleExpand: () => void; onOpen: () => void }) {
  const customer = ticket.customer?.user || {};
  const name = senderName(ticket);
  const last = ticket.messages?.[ticket.messages.length - 1];
  const preview = last ? last.message : ticket.description || ticket.subject;
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.OPEN;
  const recent = (ticket.messages || []).slice(-PREVIEW_MESSAGES);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
      style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: '0.6rem', background: 'var(--bg-card, #fff)', cursor: 'pointer', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{customer.email || ''}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{timeAgo(last?.createdAt || ticket.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', minWidth: 0 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
            <span className={`badge ${ticket.status === 'RESOLVED' ? 'badge-success' : ticket.status === 'CLOSED' ? '' : 'badge-warning'}`} style={{ color: status.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              {ticket.status === 'OPEN' ? <AlertCircle size={12} /> : ticket.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flexShrink: 0 }}
              aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
              onClick={e => { e.stopPropagation(); onToggleExpand(); }}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.6rem 1rem' }}>
          {recent.length === 0 && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No messages yet — {ticket.subject}</div>}
          {recent.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.8125rem', minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: isDevRole(m.role) ? 'var(--primary)' : 'var(--text-primary)', flexShrink: 0, maxWidth: '35%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isDevRole(m.role) ? 'You' : (m.sender || 'User')}</span>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</span>
            </div>
          ))}
          <div style={{ marginTop: '0.4rem', fontSize: '0.8125rem', color: 'var(--primary)' }}>Open full chat →</div>
        </div>
      )}
    </div>
  );
}

function DetailView({ ticket, onBack, onStatus, onReply }: { ticket: any; onBack: () => void; onStatus: (s: string) => void; onReply: (m: string) => void }) {
  const [reply, setReply] = useState('');
  const customer = ticket.customer?.user || {};
  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.OPEN;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card, #fff)' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle, #f7f7f8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronLeft size={16} /> Inbox</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{ticket.subject}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{senderName(ticket)} · {customer.email || '—'} · {new Date(ticket.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span className={`badge ${ticket.status === 'RESOLVED' ? 'badge-success' : ticket.status === 'CLOSED' ? '' : 'badge-warning'}`} style={{ color: status.color, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {ticket.status === 'OPEN' ? <AlertCircle size={12} /> : ticket.status === 'RESOLVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {status.label}
            </span>
            {ticket.status !== 'RESOLVED' && <button className="btn btn-ghost btn-sm" onClick={() => onStatus('RESOLVED')}>Mark resolved</button>}
            {ticket.status !== 'CLOSED' && <button className="btn btn-ghost btn-sm" onClick={() => onStatus('CLOSED')}>Close</button>}
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 420, overflowY: 'auto' }}>
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
            onKeyDown={async e => { if (e.key === 'Enter' && reply.trim()) { await onReply(reply); setReply(''); } }}
            placeholder="Reply to this ticket..."
            maxLength={5000}
            style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem' }}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={!reply.trim()} onClick={async () => { await onReply(reply); setReply(''); }}><Send size={14} style={{ marginRight: '0.25rem' }} /> Send</button>
        </div>
      </div>
    </div>
  );
}