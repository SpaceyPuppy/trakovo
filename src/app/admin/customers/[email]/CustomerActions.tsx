'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Alias {
  id: string
  alias_email: string
}

interface Props {
  email: string
  isArchived: boolean
  initialAliases: Alias[]
}

export default function CustomerActions({ email, isArchived, initialAliases }: Props) {
  const router = useRouter()
  const [aliases, setAliases] = useState<Alias[]>(initialAliases)
  const [newAlias, setNewAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [archived, setArchived] = useState(isArchived)

  async function handleArchive() {
    const action = archived ? 'Unarchive' : 'Archive'
    if (!confirm(`${action} this customer? ${!archived ? 'They will be hidden from the customer list.' : ''}`)) return
    setBusy(true)
    const method = archived ? 'DELETE' : 'POST'
    await fetch(`/api/admin/customers/${encodeURIComponent(email)}/archive`, { method })
    setBusy(false)
    setArchived(!archived)
    router.refresh()
  }

  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault()
    if (!newAlias.trim()) return
    setBusy(true)
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}/aliases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias_email: newAlias.trim() }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { alert(data.error ?? 'Failed to link email'); return }
    setAliases(a => [...a, { id: data.id, alias_email: data.alias_email }])
    setNewAlias('')
    router.refresh()
  }

  async function handleRemoveAlias(id: string) {
    if (!confirm('Unlink this email?')) return
    await fetch(`/api/admin/customers/${encodeURIComponent(email)}/aliases/${id}`, { method: 'DELETE' })
    setAliases(a => a.filter(alias => alias.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Linked emails */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h2 className="font-display font-bold text-[14px]">Linked Profiles</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">
            Link other email addresses that belong to the same person. Their bookings will be merged into this profile. Visible to admin only — does not affect vendor data.
          </p>
        </div>

        <div className="px-6 py-5 border-b border-border">
          <form onSubmit={handleAddAlias} className="flex gap-3">
            <input
              type="email"
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              placeholder="another@email.com"
              className="flex-1 border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              disabled={busy || !newAlias.trim()}
              className="bg-accent text-white font-semibold text-[13.5px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap">
              Link Email
            </button>
          </form>
        </div>

        {aliases.length === 0 ? (
          <div className="px-6 py-6 text-center text-[13.5px] text-ink-4">No linked emails.</div>
        ) : (
          <ul className="divide-y divide-border">
            {aliases.map(a => (
              <li key={a.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <span className="font-mono text-[13px] text-ink-3">{a.alias_email}</span>
                <button
                  onClick={() => handleRemoveAlias(a.id)}
                  className="text-red-400 hover:text-red-600 text-[12px] font-medium transition-colors">
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Archive */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-[13.5px]">{archived ? 'Customer is archived' : 'Archive Customer'}</p>
          <p className="text-[12.5px] text-ink-3 mt-0.5">
            {archived
              ? 'This customer is hidden from the customer list. Their bookings are unaffected.'
              : 'Hide this customer from the customer list. Booking records are not deleted.'}
          </p>
        </div>
        <button
          onClick={handleArchive}
          disabled={busy}
          className={`shrink-0 text-[13px] font-semibold px-4 py-2 rounded-[6px] border transition-colors disabled:opacity-50 ${
            archived
              ? 'border-accent/30 bg-accent-bg text-accent hover:bg-accent hover:text-white'
              : 'border-red-200 bg-white text-red-500 hover:bg-red-50'
          }`}>
          {archived ? 'Unarchive' : 'Archive'}
        </button>
      </div>
    </div>
  )
}
