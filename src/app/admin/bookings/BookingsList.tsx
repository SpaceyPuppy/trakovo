'use client'
import Link from 'next/link'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import PortalIcon from '@/components/ui/PortalIcon'
import type { AdminBookingSort, AdminBookingSortDirection, AdminBookingStatusFilter } from '@/lib/api'
import type { BookingResponse } from '@/types'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_TABS: Array<{ key: AdminBookingStatusFilter; label: string }> = [
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

const SORT_LABELS: Record<AdminBookingSort, string> = {
  start_date: 'Start date',
  public_id: 'Reference',
  created_at: 'Received',
  contact_name: 'Customer',
  vehicle: 'Booking',
}

function bookingLabel(b: BookingResponse) {
  if (b.service_type === 'taxi') return 'Taxi request'
  if (b.service_type === 'cpv') return 'CPV service'
  return b.vehicle?.name ?? 'Vehicle booking'
}

function bookingContext(b: BookingResponse) {
  if (b.vendor_name) return b.vendor_client_name || b.contact_name || 'Direct vendor use'
  return b.hire_type?.replace('-', ' ') ?? '—'
}

function primaryParty(b: BookingResponse) {
  return b.vendor_name ?? b.contact_name ?? b.driver_name ?? '—'
}

function secondaryParty(b: BookingResponse) {
  if (b.vendor_name) return b.contact_name || b.vendor_client_name || 'Direct vendor use'
  return b.contact_email || 'Contact details unavailable'
}

function sortHref(status: AdminBookingStatusFilter, currentSort: AdminBookingSort, currentDirection: AdminBookingSortDirection, nextSort: AdminBookingSort) {
  const nextDirection = currentSort === nextSort && currentDirection === 'asc' ? 'desc' : 'asc'
  const params = new URLSearchParams({ status, sort: nextSort, direction: nextDirection, page: '1' })
  return `/admin/bookings?${params.toString()}`
}

export default function BookingsList({
  bookings,
  activeStatus,
  statusCounts,
  sort,
  direction,
}: {
  bookings: (BookingResponse & { is_enquiry?: boolean })[]
  activeStatus: AdminBookingStatusFilter
  statusCounts: Record<AdminBookingStatusFilter, number>
  sort: AdminBookingSort
  direction: AdminBookingSortDirection
}) {
  const [view, setView] = useState<'card' | 'list'>('list')

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-border rounded-[9px] p-1 w-fit max-w-full overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.key}
              href={`/admin/bookings?status=${tab.key}&sort=${sort}&direction=${direction}&page=1`}
              className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeStatus === tab.key ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink hover:bg-bg'
              }`}
            >
              {tab.label}
              <span className={activeStatus === tab.key ? 'text-white/65' : 'text-ink-4'}>{statusCounts[tab.key] ?? 0}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white border border-border rounded-[9px] p-1">
          <button
            onClick={() => setView('list')}
            aria-label="Table view"
            aria-pressed={view === 'list'}
            className={`p-1.5 rounded-[6px] transition-colors ${view === 'list' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink hover:bg-bg'}`}
          >
            <PortalIcon name="clipboard-list" size={16} />
          </button>
          <button
            onClick={() => setView('card')}
            aria-label="Card view"
            aria-pressed={view === 'card'}
            className={`p-1.5 rounded-[6px] transition-colors ${view === 'card' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink hover:bg-bg'}`}
          >
            <PortalIcon name="layout-dashboard" size={16} />
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-12 text-center shadow-card">
          <PortalIcon name="clipboard-list" size={28} className="mx-auto mb-3 text-ink-4" />
          <p className="font-display font-bold text-[16px] mb-1">No {activeStatus === 'all' ? '' : activeStatus} bookings</p>
          <p className="text-[13px] text-ink-3">
            {activeStatus === 'all' ? 'Bookings will appear here once customers submit requests.' : `No ${activeStatus} bookings at this time.`}
          </p>
        </div>
      ) : view === 'card' ? (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.public_id} className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
              <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono font-bold text-accent text-[15px]">{b.public_id}</p>
                    {b.vendor_name && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Vendor</span>}
                    {b.is_enquiry && <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Enquiry</span>}
                  </div>
                  <p className="font-display font-bold text-[16px] mt-1">{bookingLabel(b)}</p>
                  <p className="text-[12px] text-ink-3 mt-0.5 capitalize">{bookingContext(b)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>{b.status}</span>
                  <Link href={`/admin/bookings/${b.id}`} className="text-[13px] font-semibold text-accent hover:underline whitespace-nowrap">View <span aria-hidden="true">→</span></Link>
                </div>
              </div>
              <div className="px-6 pb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                <InfoBlock label={b.vendor_name ? 'Vendor' : 'Customer'} value={primaryParty(b)} />
                <InfoBlock label={b.vendor_name ? 'Contact / client' : 'Email'} value={secondaryParty(b)} />
                <InfoBlock label="Dates" value={`${fmtDate(b.start_date)} → ${fmtDate(b.end_date)}`} />
                <InfoBlock label="Total" value={b.total_cost ? formatCurrency(b.total_cost) : '—'} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="bg-bg text-ink-4 text-[10px] font-bold uppercase tracking-[0.08em] border-b border-border">
                <tr>
                  <SortableHeader label="Reference" field="public_id" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Booking" field="vehicle" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Customer" field="contact_name" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Dates" field="start_date" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Received" field="created_at" activeSort={sort} direction={direction} status={activeStatus} />
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3 pr-6"> </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.public_id} className="border-t border-border hover:bg-bg/60 transition-colors">
                    <td className="pl-6 pr-4 py-3.5 align-top">
                      <span className="font-mono font-bold text-accent text-[12.5px]">{b.public_id}</span>
                      {b.vendor_name && <span className="block text-[10px] text-blue-700 font-semibold mt-1">Vendor booking</span>}
                    </td>
                    <td className="px-4 py-3.5 align-top max-w-[190px]">
                      <p className="font-semibold text-ink truncate">{bookingLabel(b)}</p>
                      <p className="text-[11px] text-ink-3 capitalize mt-1 truncate">{bookingContext(b)}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top max-w-[190px]">
                      <p className="font-semibold text-ink truncate">{primaryParty(b)}</p>
                      <p className="text-[11px] text-ink-3 mt-1 truncate">{secondaryParty(b)}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top whitespace-nowrap text-ink-2 text-[12px]">
                      <p>{fmtDate(b.start_date)}</p>
                      <p className="text-[11px] text-ink-3 mt-1">to {fmtDate(b.end_date)}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top whitespace-nowrap text-ink-3 text-[12px]">{fmtDate(b.created_at.slice(0, 10))}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize ${STATUS_STYLES[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>{b.status}</span>
                    </td>
                    <td className="px-4 pr-6 py-3.5 align-top text-right">
                      <Link href={`/admin/bookings/${b.id}`} className="inline-flex items-center gap-1 text-accent hover:text-accent-dark font-semibold text-[12.5px] whitespace-nowrap">Open <PortalIcon name="arrow-up-right" size={14} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-border text-[11px] text-ink-3 flex items-center justify-between gap-3">
            <span>Sorted by {SORT_LABELS[sort].toLowerCase()} · {direction === 'asc' ? 'ascending' : 'descending'}</span>
            <span>Click a column heading to change the order</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableHeader({ label, field, activeSort, direction, status }: { label: string; field: AdminBookingSort; activeSort: AdminBookingSort; direction: AdminBookingSortDirection; status: AdminBookingStatusFilter }) {
  const active = activeSort === field
  return (
    <th className="text-left">
      <Link
        href={sortHref(status, activeSort, direction, field)}
        aria-label={`Sort by ${label}`}
        className="flex items-center gap-1.5 px-4 py-3 hover:text-ink hover:bg-accent/[0.05] transition-colors"
      >
        <span>{label}</span>
        <PortalIcon name={active ? (direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevrons-up-down'} size={13} />
      </Link>
    </th>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-ink font-medium truncate">{value}</p>
    </div>
  )
}
