'use client'
import { useState, useEffect, useCallback } from 'react'

interface Blockout {
  id: string
  vehicle_id: string | null
  vehicle_name: string | null
  start_date: string
  end_date: string
  reason: string
}

interface Vehicle {
  id: string
  name: string
}

function formatDate(d: string) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function BlockoutsClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [loading, setLoading] = useState(true)
  const [vehicleId, setVehicleId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/blockouts')
    if (res.ok) setBlockouts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/blockouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        reason,
        vehicle_id: vehicleId || null,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    } else {
      setStartDate('')
      setEndDate('')
      setReason('')
      setVehicleId('')
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this blocked date range?')) return
    await fetch(`/api/admin/blockouts/${id}`, { method: 'DELETE' })
    await load()
  }

  const globalBlockouts = blockouts.filter(b => !b.vehicle_id)
  const vehicleBlockouts = blockouts.filter(b => b.vehicle_id)

  return (
    <div className="space-y-8">

      {/* Add form */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h2 className="font-display font-bold text-[14px]">Add Blockout</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">Leave vehicle blank to block the entire fleet.</p>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px]">
              <label className="block text-[12px] font-medium text-ink-3 mb-1">Vehicle <span className="text-ink-4">(optional — blank = all vehicles)</span></label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
              >
                <option value="">Fleet-wide (all vehicles)</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
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
      </div>

      {/* Fleet-wide blockouts */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h2 className="font-display font-bold text-[14px]">Fleet-wide Blockouts</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">Apply to all vehicles — no bookings accepted during these periods.</p>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-[13.5px] text-ink-4">Loading…</div>
        ) : globalBlockouts.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13.5px] text-ink-4">No fleet-wide blockouts set.</div>
        ) : (
          <BlockoutTable rows={globalBlockouts} onDelete={handleDelete} showVehicle={false} />
        )}
      </div>

      {/* Per-vehicle blockouts */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h2 className="font-display font-bold text-[14px]">Per-vehicle Blockouts</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">Apply to individual vehicles only.</p>
        </div>
        {loading ? (
          <div className="px-6 py-6 text-[13.5px] text-ink-4">Loading…</div>
        ) : vehicleBlockouts.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13.5px] text-ink-4">No per-vehicle blockouts set.</div>
        ) : (
          <BlockoutTable rows={vehicleBlockouts} onDelete={handleDelete} showVehicle={true} />
        )}
      </div>
    </div>
  )
}

function BlockoutTable({ rows, onDelete, showVehicle }: {
  rows: Blockout[]
  onDelete: (id: string) => void
  showVehicle: boolean
}) {
  return (
    <table className="w-full text-[13.5px]">
      <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
        <tr>
          {showVehicle && <th className="text-left px-6 py-3">Vehicle</th>}
          <th className="text-left px-6 py-3">Start</th>
          <th className="text-left px-6 py-3">End</th>
          <th className="text-left px-6 py-3">Reason</th>
          <th className="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(b => (
          <tr key={b.id} className="border-t border-border hover:bg-bg/50">
            {showVehicle && <td className="px-6 py-3 font-medium">{b.vehicle_name ?? '—'}</td>}
            <td className="px-6 py-3 font-medium">{formatDate(b.start_date)}</td>
            <td className="px-6 py-3 font-medium">{formatDate(b.end_date)}</td>
            <td className="px-6 py-3 text-ink-3">{b.reason || <span className="italic text-ink-4">—</span>}</td>
            <td className="px-6 py-3 text-right">
              <button
                onClick={() => onDelete(b.id)}
                className="text-red-500 hover:text-red-700 font-medium text-[13px] transition-colors">
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
