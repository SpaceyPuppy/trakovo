'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Driver = {
  id: string; name: string; username: string; email: string; phone: string
  is_active: boolean; public_id: string; created_at: string
  bookings: Array<{ id: string; public_id: string; start_date: string; end_date: string; status: string; vehicle: { name: string } | null }>
  messages: Array<{ id: string; subject: string; message: string; status: string; staff_reply: string | null; created_at: string }>
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default function AdminDriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [tab, setTab] = useState<'bookings' | 'messages'>('bookings')
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/drivers/${id}`)
    if (res.ok) setDriver(await res.json())
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleActive() {
    if (!driver) return
    await fetch(`/api/admin/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !driver.is_active }),
    })
    await load()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/admin/drivers/${id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    setNewPassword('')
    setPasswordMsg('Password updated')
    setSaving(false)
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  async function sendReply(messageId: string) {
    await fetch(`/api/admin/drivers/${id}/messages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, staff_reply: replyText, status: 'resolved' }),
    })
    setReplyId(null)
    setReplyText('')
    await load()
  }

  async function deleteDriver() {
    if (!confirm(`Delete driver "${driver?.name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/drivers/${id}`, { method: 'DELETE' })
    router.push('/admin/drivers')
  }

  if (!driver) return <div className="px-10 py-10 text-ink-3 text-[14px]">Loading…</div>

  return (
    <div className="px-10 py-10 max-w-[860px]">
      <Link href="/admin/drivers" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7">
        ← Back to Drivers
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="font-mono text-[13px] text-ink-4 mb-0.5">{driver.public_id}</p>
          <h1 className="font-display font-bold text-[26px] tracking-tight">{driver.name}</h1>
          <p className="text-[13px] text-ink-3 mt-0.5 font-mono">{driver.username}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={toggleActive}
            className={`text-[13px] font-semibold px-4 py-2 rounded-[6px] border transition-colors ${driver.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-success/30 text-success hover:bg-success-bg'}`}>
            {driver.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={deleteDriver}
            className="text-[13px] font-semibold px-4 py-2 rounded-[6px] border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Contact info */}
        <section className="bg-white border border-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Contact</p>
          <div className="grid grid-cols-2 gap-4 text-[13.5px]">
            <div><p className="text-ink-4 text-[11px] uppercase tracking-wider mb-0.5">Email</p><p className="text-ink">{driver.email || '—'}</p></div>
            <div><p className="text-ink-4 text-[11px] uppercase tracking-wider mb-0.5">Phone</p><p className="text-ink">{driver.phone || '—'}</p></div>
          </div>
        </section>

        {/* Change password */}
        <section className="bg-white border border-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Change Password</p>
          <form onSubmit={changePassword} className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="New password" required
                className="w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button type="submit" disabled={saving}
              className="bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
              Update
            </button>
            {passwordMsg && <span className="text-[12px] text-success">{passwordMsg}</span>}
          </form>
        </section>

        {/* Tabs */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            {(['bookings', 'messages'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3.5 text-[13.5px] font-semibold capitalize transition-colors ${tab === t ? 'text-accent border-b-2 border-accent -mb-px' : 'text-ink-3 hover:text-ink'}`}>
                {t} {t === 'messages' && driver.messages.filter(m => m.status === 'open').length > 0 && (
                  <span className="ml-1.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {driver.messages.filter(m => m.status === 'open').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'bookings' && (
            driver.bookings.length === 0 ? (
              <p className="px-6 py-8 text-[13.5px] text-ink-4 text-center">No bookings assigned.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>{['Reference', 'Vehicle', 'Dates', 'Status'].map(h => <th key={h} className="text-left px-6 py-2.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {driver.bookings.map(b => (
                    <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                      <td className="px-6 py-3">
                        <Link href={`/admin/bookings/${b.id}`} className="font-mono text-[12.5px] font-bold text-accent hover:underline">{b.public_id}</Link>
                      </td>
                      <td className="px-6 py-3 text-ink-3">{b.vehicle?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-ink-3 text-[12px]">{b.start_date} → {b.end_date}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'messages' && (
            driver.messages.length === 0 ? (
              <p className="px-6 py-8 text-[13.5px] text-ink-4 text-center">No messages from this driver.</p>
            ) : (
              <div className="divide-y divide-border">
                {driver.messages.map(m => (
                  <div key={m.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-[14px]">{m.subject}</p>
                        <p className="text-[12px] text-ink-4">{new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${m.status === 'open' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-success-bg text-success border-success/30'}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-ink whitespace-pre-wrap mb-3">{m.message}</p>
                    {m.staff_reply && (
                      <div className="bg-accent-bg border border-accent/20 rounded-[6px] px-4 py-3 mb-3">
                        <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">Your Reply</p>
                        <p className="text-[13.5px] text-ink whitespace-pre-wrap">{m.staff_reply}</p>
                      </div>
                    )}
                    {!m.staff_reply && (
                      replyId === m.id ? (
                        <div className="flex gap-3">
                          <textarea
                            value={replyText} onChange={e => setReplyText(e.target.value)}
                            rows={3} placeholder="Type your reply…"
                            className="flex-1 border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                          />
                          <div className="flex flex-col gap-2">
                            <button onClick={() => sendReply(m.id)}
                              className="bg-accent text-white font-semibold text-[12px] px-3 py-1.5 rounded-[6px] hover:bg-accent-dark transition-colors">
                              Send
                            </button>
                            <button onClick={() => setReplyId(null)}
                              className="text-ink-3 text-[12px] px-3 py-1.5 rounded-[6px] hover:bg-bg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyId(m.id); setReplyText('') }}
                          className="text-[13px] text-accent hover:underline font-medium">
                          Reply →
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
