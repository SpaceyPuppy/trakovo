'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Booking {
  id: string
  public_id: string
  status: string
  service_type?: string
  start_date: string
  end_date: string
  total_days: number
  total_cost: number
  contact_name: string | null
  vehicle: { name: string } | null
  vendor_client: { name: string } | null
}

const SERVICE_LABELS: Record<string, string> = {
  taxi: 'Taxi',
  cpv:  'CPV',
}

interface Props {
  bookings: Booking[]
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default function VendorBookingsList({ bookings }: Props) {
  const [tab, setTab] = useState('all')

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab)

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {TABS.map(t => {
          const count = t.key === 'all' ? bookings.length : bookings.filter(b => b.status === t.key).length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {t.label}
              {count > 0 && <span className="text-[11px] bg-ink-4/20 text-ink-3 rounded-full px-1.5 py-0.5 font-bold">{count}</span>}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <p className="text-ink-3 text-[14px]">No bookings in this category.</p>
          <Link href="/vendor/bookings/new/multi" className="inline-block mt-4 text-accent hover:underline text-[13.5px] font-semibold">Create a new booking →</Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Reference', 'Vehicle', 'Client', 'Dates', 'Duration', 'Status', ''].map(h => <th key={h} className="text-left px-6 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[12.5px] font-bold text-ink">{b.public_id}</span>
                  </td>
                  <td className="px-6 py-4 text-ink-3">
                    {b.vehicle
                      ? b.vehicle.name
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-50 text-slate-600 border-slate-200">{SERVICE_LABELS[b.service_type ?? ''] ?? b.service_type ?? '—'}</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-ink-3">{b.vendor_client?.name ?? b.contact_name ?? '—'}</td>
                  <td className="px-6 py-4 text-ink-3 text-[12px]">{b.start_date} → {b.end_date}</td>
                  <td className="px-6 py-4 text-ink-3">{b.total_days}d</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/vendor/bookings/${b.id}`} className="text-accent hover:underline font-medium text-[13px]">View →</Link>
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
