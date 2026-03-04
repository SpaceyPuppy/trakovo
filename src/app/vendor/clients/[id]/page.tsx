'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string
  public_id: string
  status: string
  start_date: string
  end_date: string
  total_days: number
  vehicle: { name: string }
}

interface Client {
  id: string
  public_id: string
  name: string
  email: string
  phone: string
  reference: string
  notes: string
  is_active: boolean
  bookings: Booking[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default function VendorClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', phone: '', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetch(`/api/vendor/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.client) {
          setClient(d.client)
          setForm({
            name: d.client.name,
            email: d.client.email,
            phone: d.client.phone,
            reference: d.client.reference,
            notes: d.client.notes,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/vendor/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaveMsg('Saved.')
        setTimeout(() => setSaveMsg(''), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/vendor/clients/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/vendor/clients')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:border-accent bg-white'
  const lbl = 'block text-[12px] font-semibold text-ink-3 mb-1'

  if (loading) {
    return <div className="py-24 text-center text-ink-3 text-[14px]">Loading…</div>
  }

  if (!client) {
    return (
      <div className="py-24 text-center">
        <p className="text-ink-3 text-[14px] mb-4">Client not found.</p>
        <Link href="/vendor/clients" className="text-accent hover:underline text-[13.5px]">← Back to Clients</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <Link href="/vendor/clients" className="text-[13px] text-ink-3 hover:text-accent transition-colors">← Clients</Link>
          <h1 className="font-display font-bold text-[26px] tracking-tight mt-2">{client.name}</h1>
          <p className="text-[13px] text-ink-4 font-mono mt-0.5">{client.public_id}</p>
        </div>
        <Link href={`/vendor/bookings/new`}
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
          + Book for this client
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSave} className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="font-semibold text-[13.5px] text-ink mb-1">Client details</p>
            <div>
              <label className={lbl}>Full name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inp} required />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Reference / Claim no.</label>
              <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inp} />
            </div>
            <div className="flex items-center justify-between pt-1">
              {saveMsg && <span className="text-[12.5px] text-success font-medium">{saveMsg}</span>}
              <div className="ml-auto">
                <button type="submit" disabled={saving}
                  className="bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark disabled:opacity-60 transition-colors">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>

          {/* Delete */}
          <div className="mt-4 bg-white border border-border rounded-xl p-5">
            <p className="font-semibold text-[13.5px] text-ink mb-1">Remove client</p>
            <p className="text-[12.5px] text-ink-3 mb-3">The client will be hidden from your account. Existing bookings are preserved.</p>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-[12.5px] text-red-600 font-medium">Are you sure?</p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting}
                    className="bg-red-600 text-white text-[13px] font-semibold px-4 py-1.5 rounded-[6px] hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {deleting ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-[13px] text-ink-3 hover:text-ink px-3 py-1.5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-[13px] text-red-600 hover:text-red-700 font-medium transition-colors">
                Remove client
              </button>
            )}
          </div>
        </div>

        {/* Booking history */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-bg">
              <p className="font-display font-bold text-[14px]">Booking history</p>
            </div>
            {client.bookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-ink-3 text-[14px]">No bookings for this client yet.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    {['Reference', 'Vehicle', 'Dates', 'Days', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {client.bookings.map(b => (
                    <tr key={b.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-[12.5px] font-bold text-ink">{b.public_id}</td>
                      <td className="px-5 py-3 text-ink-3">{b.vehicle.name}</td>
                      <td className="px-5 py-3 text-ink-3 text-[12px]">{b.start_date} → {b.end_date}</td>
                      <td className="px-5 py-3 text-ink-3">{b.total_days}d</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/vendor/bookings/${b.id}`} className="text-accent hover:underline font-medium text-[12.5px]">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
