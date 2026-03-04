'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const statuses = ['pending', 'confirmed', 'completed', 'cancelled']
const styles: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-[#e8f0fe] text-[#1a56db] border-[#c3d8fb]',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default function BookingStatusUpdater({ bookingId, currentStatus }: { bookingId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function update(newStatus: string) {
    if (newStatus === status) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) setStatus(newStatus)
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize', styles[status] ?? 'bg-bg text-ink-3 border-border')}>
        {saving ? '…' : status}
      </span>
      <select value={status} onChange={e => update(e.target.value)} disabled={saving}
        className="border border-border rounded-[6px] px-2.5 py-1.5 text-[12.5px] text-ink bg-white outline-none focus:border-ink transition-all disabled:opacity-50">
        {statuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
      </select>
    </div>
  )
}
