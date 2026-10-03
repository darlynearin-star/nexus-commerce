'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useDismiss } from '@/lib/use-dismiss';
import { Search, Shield, ShieldOff, Lock, Plus, X, Check, AlertTriangle, Eye, Activity, KeyRound, ShoppingBag, BarChart3, Globe, User as UserIcon, ShieldCheck } from 'lucide-react';

const ROLES = ['CUSTOMER', 'RETAILER', 'DEVELOPER', 'SUPER_DEVELOPER'];

const fmt = (n: number) => new Intl.NumberFormat('en-UG').format(Math.round(n || 0));
const fmtMoney = (n: number) => `UGX ${fmt(n)}`;
const dt = (d?: string) => d ? new Date(d).toLocaleString() : '—';
const dateOnly = (d?: string) => d ? new Date(d).toLocaleDateString() : '—';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'CUSTOMER', password: '' });

  const [trackingUser, setTrackingUser] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const createModalRef = useDismiss(showCreate, () => setShowCreate(false));
  const trackModalRef = useDismiss(trackingUser, () => { setTrackingUser(null); setTrackingData(null); });
  const resetModalRef = useDismiss(resetTarget, () => { setResetTarget(null); setResetPassword(''); setResetError(''); setResetSuccess(''); });

  const load = async () => {
    try { const r: any = await api.get('/admin/users'); setUsers(r.data); } catch (e: any) { console.error('API error:', e); }
  };
  useEffect(() => { load(); }, []);

  const toggleUser = async (id: string, isActive: boolean) => {
    await api.put(`/admin/users/${id}`, { isActive: !isActive });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !isActive } : u));
  };

  const loadTracking = async (id: string) => {
    setTrackingUser(users.find(u => u.id === id) || null);
    setTrackingData(null);
    setTrackingLoading(true);
    try {
      const r: any = await api.get(`/admin/users/${id}/tracking`);
      setTrackingData(r.data);
    } catch (e: any) { setTrackingData({ error: e?.message || 'Failed to load tracking data' }); }
    finally { setTrackingLoading(false); }
  };

  const confirmReset = async () => {
    if (!resetTarget || !resetPassword) return;
    setResetError(''); setResetSuccess('');
    try {
      await api.put(`/admin/users/${resetTarget.id}`, { password: resetPassword });
      setResetSuccess('Password updated. The user can now sign in with the new password.');
      setResetPassword('');
      setTrackingData(null);
    } catch (e: any) { setResetError(e?.message || 'Failed to reset password'); }
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
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-icon" title="Track account activity" aria-label="Track account activity" onClick={() => loadTracking(u.id)}><Eye size={14} /></button>
                    {u.role === 'SUPER_DEVELOPER' ? (
                      <span className="btn btn-ghost btn-icon" title="Protected account"><Lock size={14} /></span>
                    ) : (
                      <button className={`btn btn-ghost btn-icon ${!u.isActive ? 'badge-success' : 'badge-error'}`} title={u.isActive ? 'Suspend user' : 'Reactivate user'} aria-label={u.isActive ? 'Suspend user' : 'Reactivate user'} onClick={() => toggleUser(u.id, u.isActive)}>
                        {u.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                    )}
                    {u.role === 'SUPER_DEVELOPER' ? (
                      <span className="btn btn-ghost btn-icon" title="Protected account"><KeyRound size={14} /></span>
                    ) : (
                      <button className="btn btn-ghost btn-icon" title="Reset password" aria-label="Reset password" onClick={() => { setResetTarget(u); setResetPassword(''); setResetError(''); setResetSuccess(''); }}><KeyRound size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {trackingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, overflow: 'auto', padding: '1rem' }}>
          <div className="card" ref={trackModalRef} tabIndex={-1} style={{ width: 'min(920px, 94vw)', maxHeight: '92vh', overflow: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Account Tracking — {trackingUser.firstName} {trackingUser.lastName}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{trackingUser.email}</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => { setTrackingUser(null); setTrackingData(null); }} aria-label="Close dialog"><X size={18} /></button>
            </div>

            {trackingLoading ? (
              <div style={{ padding: '2rem 0' }}><div className="skeleton" style={{ height: 300 }} /></div>
            ) : trackingData?.error ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.5rem', background: '#2e0505', color: '#f87171' }}><AlertTriangle size={16} /> {trackingData.error}</div>
            ) : trackingData ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {(() => {
                    const d = trackingData;
                    const cards = [
                      { icon: <UserIcon size={18} />, label: 'Role', value: d.user?.role || '—' },
                      { icon: <ShieldCheck size={18} />, label: 'Status', value: d.user?.isActive ? 'Active' : 'Suspended' },
                      { icon: <Activity size={18} />, label: 'Logins (sessions)', value: `${d.sessions?.active || 0} active / ${d.sessions?.total || 0} total` },
                      { icon: <Globe size={18} />, label: 'Account activity', value: `${d.activity?.total || 0} events` },
                      { icon: <BarChart3 size={18} />, label: 'Traffic (pageviews)', value: `${d.analytics?.total || 0}` },
                    ];
                    return cards.map((c, i) => (
                      <div key={i} className="card" style={{ flex: '1 1 150px', padding: '0.875rem' }}>
                        <div style={{ color: 'var(--primary)', marginBottom: '0.375rem' }}>{c.icon}</div>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>{c.label}</p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{c.value}</p>
                      </div>
                    ));
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Store & Orders</h4>
                    {trackingData.store ? (
                      <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Store:</span> {trackingData.store.name} <span style={{ color: 'var(--text-secondary)' }}>(/{trackingData.store.slug})</span></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Products:</span> {trackingData.store.products}</div>
                        <div style={{ paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Orders (store)</span><span>{trackingData.storeOrders?.count || 0}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Revenue</span><span style={{ fontWeight: 600 }}>{fmtMoney(trackingData.storeOrders?.revenue || 0)}</span></div>
                          {(trackingData.storeOrders?.recent || []).length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Recent orders</p>
                              {trackingData.storeOrders.recent.slice(0, 5).map((o: any) => (
                                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.125rem 0' }}>
                                  <span>{o.orderNumber} <span style={{ color: 'var(--text-secondary)' }}>({o.status})</span></span>
                                  <span style={{ fontWeight: 500 }}>{fmtMoney(o.total)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : trackingData.customerOrders ? (
                      <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Orders (placed)</span><span>{trackingData.customerOrders.count}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Total spent</span><span style={{ fontWeight: 600 }}>{fmtMoney(trackingData.customerOrders.spent)}</span></div>
                        {(trackingData.customerOrders?.recent || []).length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Recent orders</p>
                            {trackingData.customerOrders.recent.slice(0, 5).map((o: any) => (
                              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.125rem 0' }}>
                                <span>{o.orderNumber} <span style={{ color: 'var(--text-secondary)' }}>({o.store?.name || ''} / {o.status})</span></span>
                                <span style={{ fontWeight: 500 }}>{fmtMoney(o.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No store or customer orders for this account.</p>
                    )}
                  </div>

                  <div className="card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Traffic</h4>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pageview / analytics events tied to this account ({trackingData.analytics?.total || 0} total)</div>
                    {(trackingData.analytics?.recent || []).length === 0
                      ? <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No analytics events recorded yet.</p>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {trackingData.analytics.recent.slice(0, 8).map((e: any) => (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <span><span className="badge badge-info">{e.eventType}</span> {e.pageUrl || ''}</span>
                              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{dt(e.createdAt)}</span>
                            </div>
                          ))}
                        </div>}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Recent Activity</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last session: {dt(trackingData.sessions?.last?.lastActivity)} from {trackingData.sessions?.last?.ipAddress || '—'}</div>
                  {(trackingData.activity?.recent || []).length === 0
                    ? <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No activity recorded yet.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {trackingData.activity.recent.slice(0, 12).map((l: any) => (
                          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                              <span className="badge badge-info">{l.action}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{l.resource}{l.resourceId ? ` #${l.resourceId.slice(0, 8)}` : ''}</span>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{dt(l.createdAt)}</span>
                          </div>
                        ))}
                      </div>}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130 }}>
          <div className="card" ref={resetModalRef} tabIndex={-1} style={{ width: 'min(440px, 92vw)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600 }}>Reset Password</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setResetTarget(null); setResetPassword(''); setResetError(''); setResetSuccess(''); }} aria-label="Close dialog"><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Set a new password for <strong>{resetTarget.email}</strong>. They can then sign in with this password (Google sign-in keeps working too).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><label htmlFor="resetPasswordInput" style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>New password</label><input id="resetPasswordInput" className="input" type="password" placeholder="New password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} /></div>
              {resetError && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: '#2e0505', color: '#f87171', fontSize: '0.8125rem' }}><AlertTriangle size={14} /> {resetError}</div>}
              {resetSuccess && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: '#052e16', color: '#4ade80', fontSize: '0.8125rem' }}><Check size={14} /> {resetSuccess}</div>}
              <button className="btn btn-primary" onClick={confirmReset} disabled={!resetPassword}><KeyRound size={16} /> Set New Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}