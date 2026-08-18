'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDismiss } from '@/lib/use-dismiss';
import { Search, Shield, ShieldOff, Lock, Plus, X, Check, AlertTriangle } from 'lucide-react';

const ROLES = ['CUSTOMER', 'RETAILER', 'DEVELOPER', 'SUPER_DEVELOPER'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'CUSTOMER', password: '' });

  const createModalRef = useDismiss(showCreate, () => setShowCreate(false));

  const load = async () => {
    try { const r: any = await api.get('/admin/users'); setUsers(r.data); } catch (e: any) { console.error('API error:', e); }
  };
  useEffect(() => { load(); }, []);

  const toggleUser = async (id: string, isActive: boolean) => {
    await api.put(`/admin/users/${id}`, { isActive: !isActive });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !isActive } : u));
  };

  const createUser = async () => {
    setCreating(true); setError('');
    try {
      if (!form.email || !form.firstName || !form.lastName) { setError('First name, last name and email are required'); setCreating(false); return; }
      await api.post('/admin/users', { ...form });
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', role: 'CUSTOMER', password: '' });
      load();
    } catch (e: any) { setError(e?.message || 'Failed to create user'); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>User Management</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{users.length} users</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search users..." aria-label="Search users" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Create User</button>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" ref={createModalRef} tabIndex={-1} style={{ width: 'min(480px, 90vw)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600 }}>Create User</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)} aria-label="Close dialog"><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label htmlFor="userFirstName" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>First Name *</label><input id="userFirstName" className="input" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} /></div>
                <div><label htmlFor="userLastName" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Last Name *</label><input id="userLastName" className="input" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div><label htmlFor="userEmail" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Email *</label><input id="userEmail" className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="userRole" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Role</label>
                  <select id="userRole" className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label htmlFor="userPassword" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Password (optional)</label><input id="userPassword" className="input" type="password" placeholder="Password (random if blank)" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>A retailer account will also create a store for the user. An email verification is not required for created accounts.</p>
              {error && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: '#2e0505', color: '#f87171', fontSize: '0.8125rem' }}><AlertTriangle size={14} /> {error}</div>}
              <button className="btn btn-primary" onClick={createUser} disabled={creating}>{creating ? 'Creating...' : <><Check size={16} /> Create User</>}</button>
            </div>
          </div>
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container"><table className="table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>2FA</th><th>Sessions</th><th>Actions</th></tr></thead>
          <tbody>
            {users
              .filter((u: any) => !search || u.email?.includes(search) || u.firstName?.includes(search))
              .map((u: any) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.55 }}>
                <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `var(--${u.role === 'SUPER_DEVELOPER' ? 'error' : u.role === 'DEVELOPER' ? 'warning' : 'primary'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>{u.firstName?.[0]}{u.lastName?.[0]}</div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.firstName} {u.lastName}</span>
                </td>
                <td style={{ fontSize: '0.8125rem' }}>{u.email}</td>
                <td><span className={`badge ${u.role === 'SUPER_DEVELOPER' ? 'badge-error' : u.role === 'DEVELOPER' ? 'badge-warning' : u.role === 'RETAILER' ? 'badge-info' : 'badge-success'}`}>{u.role}</span></td>
                <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-error'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
                <td><span className={`badge ${u.twoFactorEnabled ? 'badge-success' : 'badge-info'}`}>{u.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></td>
                <td style={{ fontSize: '0.875rem' }}>{u._count?.sessions || 0}</td>
                <td>
                  {u.role === 'SUPER_DEVELOPER' ? (
                    <span className="btn btn-ghost btn-icon" title="Protected account"><Lock size={14} /></span>
                  ) : (
                    <button className={`btn btn-ghost btn-icon ${!u.isActive ? 'badge-success' : 'badge-error'}`} title={u.isActive ? 'Suspend user' : 'Reactivate user'} aria-label={u.isActive ? 'Suspend user' : 'Reactivate user'} onClick={() => toggleUser(u.id, u.isActive)}>
                      {u.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}