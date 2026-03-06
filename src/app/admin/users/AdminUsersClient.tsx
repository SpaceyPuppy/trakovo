'use client'
import { useState, useEffect, useCallback } from 'react'

type AdminUser = { id: string; username: string; created_at: string }

export default function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to create user')
    } else {
      setUsername('')
      setPassword('')
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string, uname: string) {
    if (!confirm(`Remove admin user "${uname}"? They will no longer be able to sign in.`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await load()
  }

  if (forbidden) {
    return (
      <div className="px-10 py-10 max-w-2xl">
        <h1 className="font-display font-bold text-[26px] tracking-tight mb-2">Admin Users</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-[13.5px] text-yellow-800">
          Only the master account can manage admin users.
        </div>
      </div>
    )
  }

  return (
    <div className="px-10 py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Admin Users</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Manage who can access the admin portal. Only the master account can add or remove users.</p>
      </div>

      {/* Add user form */}
      <div className="bg-white border border-border rounded-xl p-6 mb-6">
        <h2 className="font-display font-semibold text-[16px] mb-4">Add User</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="e.g. jane" required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Strong password" required
            />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
            {saving ? 'Adding…' : '+ Add User'}
          </button>
        </form>
      </div>

      {/* Existing users */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-[16px]">Existing Users</h2>
          <p className="text-[12px] text-ink-4 mt-0.5">The master account (set via environment variables) is not listed here.</p>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-[13.5px] text-ink-4">Loading…</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13.5px] text-ink-4">No additional admin users yet.</div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Username</th>
                <th className="text-left px-6 py-3">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[12.5px]">{u.username}</td>
                  <td className="px-6 py-4 text-ink-3">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(u.id, u.username)}
                      className="text-red-500 hover:text-red-700 font-medium text-[13px] transition-colors">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
