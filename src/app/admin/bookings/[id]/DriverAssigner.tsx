'use client'
import { useState } from 'react'

type Driver = { id: string; name: string }

export default function DriverAssigner({
  bookingId,
  drivers,
  currentDriverId,
}: {
  bookingId: string
  drivers: Driver[]
  currentDriverId: string | null
}) {
  const [value, setValue] = useState(currentDriverId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleChange(newValue: string) {
    setValue(newValue)
    setSaving(true)
    setSaved(false)
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: newValue || null }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={e => handleChange(e.target.value)}
        disabled={saving}
        className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {drivers.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {saving && <span className="text-[12px] text-ink-4">Saving…</span>}
      {saved && <span className="text-[12px] text-success">Saved</span>}
    </div>
  )
}
