'use client'
import Link from 'next/link'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { BookingResponse } from '@/types'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'enquiry', label: 'Enquiries' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-[#e8f0fe] text-[#1a56db] border-[#c3d8fb]',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  enquiry: 'bg-purple-50 text-purple-700 border-purple-200',
}

function bookingLabel(b: BookingResponse) {
  if (b.service_type === 'taxi') return 'Taxi Request'
  if (b.vendor_name) {
    if (b.service_type === 'cpv')  return 'B2B – CPV'
    return 'B2B Vehicle Choice'
  }
  return b.vehicle?.name ?? 'Unknown Vehicle'
}

function hireTypeLabel(b: BookingResponse) {
  if (b.service_type === 'taxi') return 'Taxi'
  if (b.vendor_name) return 'Direct Vendor Booking'
  return b.hire_type?.replace('-', ' ') ?? '—'
}

export default function BookingsList({ bookings: initial }: { bookings: (BookingResponse & { is_enquiry?: boolean })[] }) {
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'card' | 'list'>('card')

  const filtered = filter === 'all'
    ? initial
    : filter === 'enquiry'
      ? initial.filter(b => (b as { is_enquiry?: boolean }).is_enquiry)
      : initial.filter(b => b.status === filter && !(b as { is_enquiry?: boolean }).is_enquiry)

  const counts: Record<string, number> = { all: initial.length }
  for (const tab of STATUS_TABS.slice(1)) {
    counts[tab.key] = tab.key === 'enquiry'
      ? initial.filter(b => (b as { is_enquiry?: boolean }).is_enquiry).length
      : initial.filter(b => b.status === tab.key && !(b as { is_enquiry?: boolean }).is_enquiry).length
  }

  return (
    <div>
      {/* Toolbar: filter tabs + view toggle */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-border rounded-[8px] p-1 w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-[5px] text-[12.5px] font-semibold transition-all flex items-center gap-1.5 ${
                filter === tab.key
                  ? 'bg-ink text-white'
                  : 'text-ink-3 hover:text-ink hover:bg-bg'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-bg text-ink-4'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-[8px] p-1">
          <button
            onClick={() => setView('card')}
            title="Card view"
            className={`p-1.5 rounded-[5px] transition-colors ${view === 'card' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink hover:bg-bg'}`}
          >
            {/* Card/grid icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
              <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>
              <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            title="List view"
            className={`p-1.5 rounded-[5px] transition-colors ${view === 'list' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink hover:bg-bg'}`}
          >
            {/* List/rows icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="2" width="14" height="2.5" rx="1" fill="currentColor"/>
              <rect x="1" y="6.75" width="14" height="2.5" rx="1" fill="currentColor"/>
              <rect x="1" y="11.5" width="14" height="2.5" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-12 text-center">
          <p className="text-[28px] mb-2">📋</p>
          <p className="font-display font-bold text-[16px] mb-1">No {filter === 'all' ? '' : filter} bookings</p>
          <p className="text-[13px] text-ink-3">
            {filter === 'all' ? 'Bookings will appear here once customers submit requests.' : `No ${filter} bookings at this time.`}
          </p>
        </div>
      ) : view === 'card' ? (
        /* ── Card view ── */
        <div className="space-y-3">
          {filtered.map((b) => {
            const isEnquiry = (b as { is_enquiry?: boolean }).is_enquiry
            return (
              <div key={b.public_id} className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono font-bold text-accent text-[15px]">{b.public_id}</p>
                        {isEnquiry && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Enquiry
                          </span>
                        )}
                        {b.vendor_name && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            {b.vendor_name}
                          </span>
                        )}
                      </div>
                      <p className="font-display font-bold text-[16px] mt-0.5">{bookingLabel(b)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                      {b.status}
                    </span>
                    <Link href={`/admin/bookings/${b.id}`} className="text-[13px] font-semibold text-accent hover:underline whitespace-nowrap">
                      View →
                    </Link>
                  </div>
                </div>

                <div className="px-6 pb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                  <InfoBlock label="Hire Type" value={hireTypeLabel(b)} capitalize />
                  <InfoBlock label="Dates" value={`${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`} />
                  <InfoBlock label="Duration" value={`${b.total_days} day${b.total_days !== 1 ? 's' : ''}`} />
                  <InfoBlock label="Total" value={b.total_cost ? formatCurrency(b.total_cost) : '—'} />
                  <InfoBlock label="Name" value={b.contact_name ?? b.driver_name ?? '—'} />
                  <InfoBlock label="Email" value={b.contact_email} />
                  <InfoBlock label="Phone" value={b.contact_phone} />
                  {b.driver_licence_number && <InfoBlock label="Licence No." value={b.driver_licence_number} />}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Compact list view ── */
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <tr>
                {['Reference', 'Booking', 'Type', 'Name', 'Dates', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 first:pl-6 last:pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const isEnquiry = (b as { is_enquiry?: boolean }).is_enquiry
                return (
                  <tr key={b.public_id} className="border-t border-border hover:bg-bg/50 transition-colors">
                    <td className="pl-6 pr-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-accent text-[12.5px]">{b.public_id}</span>
                        {isEnquiry && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded-full uppercase tracking-wide">Enq</span>
                        )}
                        {b.vendor_name && (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded-full uppercase tracking-wide">B2B</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink max-w-[180px] truncate">{bookingLabel(b)}</td>
                    <td className="px-4 py-3 text-ink-3 capitalize">{hireTypeLabel(b)}</td>
                    <td className="px-4 py-3 text-ink-3 max-w-[140px] truncate">{b.contact_name ?? b.driver_name ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-3 whitespace-nowrap text-[12px]">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                    <td className="px-4 py-3 text-ink-3 whitespace-nowrap">{b.total_cost ? formatCurrency(b.total_cost) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize ${STATUS_STYLES[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 pr-6 py-3 text-right">
                      <Link href={`/admin/bookings/${b.id}`} className="text-accent hover:underline font-semibold text-[12.5px] whitespace-nowrap">View →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-ink font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  )
}
