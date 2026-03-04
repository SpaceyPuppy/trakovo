'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Client {
  id: string
  public_id: string
  name: string
  email: string
  phone: string
  reference: string
  _count: { bookings: number }
}

export default function VendorClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/vendor/clients')
      .then(r => r.json())
      .then(d => { setClients(d.clients ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.reference.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Clients</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{clients.length} active client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/vendor/clients/new"
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
          + Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, reference, or email…"
          className="w-full max-w-sm border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:border-accent bg-white"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <p className="text-ink-3 text-[14px]">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          {search ? (
            <p className="text-ink-3 text-[14px]">No clients match &ldquo;{search}&rdquo;.</p>
          ) : (
            <>
              <p className="text-ink-3 text-[14px]">No clients yet.</p>
              <Link href="/vendor/clients/new" className="inline-block mt-4 text-accent hover:underline text-[13.5px] font-semibold">
                Add your first client →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                {['Name', 'Reference', 'Email', 'Phone', 'Bookings', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-ink">{c.name}</td>
                  <td className="px-6 py-4 text-ink-3 font-mono text-[12px]">{c.reference || '—'}</td>
                  <td className="px-6 py-4 text-ink-3">{c.email || '—'}</td>
                  <td className="px-6 py-4 text-ink-3">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-ink-3">{c._count.bookings}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/vendor/clients/${c.id}`} className="text-accent hover:underline font-medium text-[13px]">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
