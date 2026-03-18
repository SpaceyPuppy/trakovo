'use client'
import Link from 'next/link'
import { useState } from 'react'

interface Enquiry {
  id: string
  public_id: string
  enquiry_status: string
  hire_type: string
  start_date: string
  end_date: string
  total_days: number
  contact_name: string | null
  contact_email: string
  contact_phone: string
  vehicle_name: string | null
  created_at: string
}

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'new',       label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost',      label: 'Lost' },
] as const

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-purple-50 text-purple-700 border-purple-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  converted: 'bg-success-bg text-success border-success/30',
  lost:      'bg-red-50 text-red-600 border-red-200',
}

export default function EnquiriesClient({ enquiries }: { enquiries: Enquiry[] }) {
  const [tab, setTab] = useState<string>('all')

  const counts = Object.fromEntries(
    TABS.map(t => [t.key, t.key === 'all' ? enquiries.length : enquiries.filter(e => e.enquiry_status === t.key).length])
  )
  const filtered = tab === 'all' ? enquiries : enquiries.filter(e => e.enquiry_status === tab)

  return (
    <div className="px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Enquiries</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Waitlist enquiries submitted when requested dates were unavailable.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-bg border border-border rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-[5px] text-[13px] font-semibold transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-ink' : 'text-ink-3 hover:text-ink'
            }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-accent/10 text-accent' : 'bg-border text-ink-4'
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13.5px] text-ink-4">No enquiries in this category.</div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Ref</th>
                <th className="text-left px-6 py-3">Vehicle</th>
                <th className="text-left px-6 py-3">Dates</th>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Contact</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Submitted</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-mono font-bold text-[12.5px] text-ink-2">{e.public_id}</span>
                  </td>
                  <td className="px-6 py-3 text-ink-3">{e.vehicle_name ?? '—'}</td>
                  <td className="px-6 py-3 text-ink-3 whitespace-nowrap">
                    {e.start_date} → {e.end_date}
                    <span className="ml-1.5 text-[11px] text-ink-4">({e.total_days}d)</span>
                  </td>
                  <td className="px-6 py-3 font-medium">{e.contact_name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <p className="text-ink-3 text-[12.5px]">{e.contact_email}</p>
                    <p className="text-ink-4 text-[12px]">{e.contact_phone}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[e.enquiry_status] ?? STATUS_COLORS.new}`}>
                      {e.enquiry_status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-ink-4 text-[12.5px]">
                    {new Date(e.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/admin/bookings/${e.id}`} className="text-accent hover:underline font-medium text-[13px]">
                      Manage →
                    </Link>
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
