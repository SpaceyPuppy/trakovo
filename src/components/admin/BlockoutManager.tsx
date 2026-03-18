'use client'
import { useState, useEffect, useCallback } from 'react'

interface Blockout {
  id: string
  start_date: string
  end_date: string
  reason: string
  created_at: string
}

interface Props {
  vehicleId?: string   // omit for global blockouts
  label?: string       // heading label override
}

function formatDate(d: string) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function BlockoutManager({ vehicleId, label }: Props) {
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const endpoint = vehicleId
    ? `/api/admin/vehicles/${vehicleId}/blockouts`
    : '/api/admin/blockouts'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(endpoint)
    if (res.ok) setBlockouts(await res.json())
    setLoading(false)
  }, [endpoint])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, reason }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    } else {
      setStartDate('')
      setEndDate('')
      setReason('')
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this blocked date range?')) return
    await fetch(`/api/admin/blockouts/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">{label ?? 'Blocked Dates'}</h3>
        <p className="text-[12.5px] text-ink-3 mt-0.5">
          {vehicleId
            ? 'Block specific date ranges for this vehicle — no bookings will be accepted during these periods.'
            : 'Block date ranges across the entire fleet. No vehicle will be bookable during these periods.'}
        </p>
      </div>

      {/* Add form */}
      <div className="px-6 py-5 border-b border-border">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[12px] font-medium text-ink-3 mb-1">Start date</label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
              className="border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-3 mb-1">End date</label>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate}
              className="border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[12px] font-medium text-ink-3 mb-1">Reason <span className="text-ink-4">(optional)</span></label>
            <input
              type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Maintenance, Public holiday"
              className="w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            type="submit" disabled={saving}
            className="bg-accent text-white font-semibold text-[13.5px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap">
            {saving ? 'Saving…' : '+ Add Blockout'}
          </button>
        </form>
        {error && <p className="text-[13px] text-red-600 mt-2">{error}</p>}
      </div>

      {/* List */}
      {loading ? (
        <div className="px-6 py-6 text-[13.5px] text-ink-4">Loading…</div>
      ) : blockouts.length === 0 ? (
        <div className="px-6 py-8 text-center text-[13.5px] text-ink-4">No blocked dates set.</div>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">Start</th>
              <th className="text-left px-6 py-3">End</th>
              <th className="text-left px-6 py-3">Reason</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {blockouts.map(b => (
              <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                <td className="px-6 py-3 font-medium">{formatDate(b.start_date)}</td>
                <td className="px-6 py-3 font-medium">{formatDate(b.end_date)}</td>
                <td className="px-6 py-3 text-ink-3">{b.reason || <span className="text-ink-4 italic">—</span>}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleDelete(b.id)}
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
  )
}
