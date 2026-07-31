'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Shield, ShieldOff } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get('/admin/users').then((r: any) => setUsers(r.data)).catch((e: any) => console.error('API error:', e)); }, []);

  const toggleUser = async (id: string, isActive: boolean) => {
    await api.put(`/admin/users/${id}`, { isActive: !isActive });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !isActive } : u));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>User Management</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{users.length} users</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm">Create User</button>
      </div>
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
                  <button className={`btn btn-ghost btn-icon ${!u.isActive ? 'badge-success' : 'badge-error'}`} title={u.isActive ? 'Suspend user' : 'Reactivate user'} onClick={() => toggleUser(u.id, u.isActive)}>
                    {u.isActive ? <ShieldOff size={14} /> : <Shield size={14} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}