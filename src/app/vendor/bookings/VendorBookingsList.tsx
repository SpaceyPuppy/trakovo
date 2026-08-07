'use client'
import Link from 'next/link'
import PortalIcon from '@/components/ui/PortalIcon'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtReceived(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

type SortField = 'start_date' | 'public_id' | 'created_at' | 'contact_name' | 'vehicle'
type SortDirection = 'asc' | 'desc'

interface Booking {
  id: string
  public_id: string
  status: string
  service_type?: string
  start_date: string
  end_date: string
  created_at: string | Date
  total_days: number
  total_cost: number
  contact_name: string | null
  vehicle: { name: string } | null
  vendor_client: { name: string } | null
}

interface Props {
  bookings: Booking[]
  activeStatus: string
  sort: SortField
  direction: SortDirection
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

const SERVICE_LABELS: Record<string, string> = { taxi: 'Taxi', cpv: 'CPV' }

function sortHref(activeStatus: string, currentSort: SortField, currentDirection: SortDirection, nextSort: SortField) {
  const nextDirection = currentSort === nextSort && currentDirection === 'asc' ? 'desc' : 'asc'
  const params = new URLSearchParams({ status: activeStatus, sort: nextSort, direction: nextDirection, page: '1' })
  return `/vendor?${params.toString()}`
}

export default function VendorBookingsList({ bookings, activeStatus, sort, direction }: Props) {
  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/vendor?status=${t.key}&sort=${sort}&direction=${direction}&page=1`}
            className={`px-4 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeStatus === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center shadow-card">
          <PortalIcon name="clipboard-list" size={28} className="mx-auto mb-3 text-ink-4" />
          <p className="text-ink-3 text-[14px]">No bookings in this category.</p>
          <Link href="/vendor/bookings/new/multi" className="inline-flex items-center gap-1 mt-4 text-accent hover:underline text-[13.5px] font-semibold">Create a new booking <span aria-hidden="true">→</span></Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="bg-bg text-ink-4 text-[10px] font-bold uppercase tracking-[0.08em]">
                <tr>
                  <SortableHeader label="Reference" field="public_id" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Vehicle / service" field="vehicle" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Client / passenger" field="contact_name" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Dates" field="start_date" activeSort={sort} direction={direction} status={activeStatus} />
                  <SortableHeader label="Received" field="created_at" activeSort={sort} direction={direction} status={activeStatus} />
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const clientName = b.vendor_client?.name ?? b.contact_name
                  const serviceLabel = b.vehicle?.name ?? SERVICE_LABELS[b.service_type ?? ''] ?? b.service_type ?? 'Booking'
                  return (
                    <tr key={b.id} className="border-t border-border hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-4 align-top"><span className="font-mono text-[12.5px] font-bold text-ink">{b.public_id}</span></td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-ink">{serviceLabel}</p>
                        <p className="text-[11px] text-ink-3 mt-1">{b.vehicle ? 'Vehicle hire' : 'Service booking'}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-ink">{clientName ?? 'Direct vendor use'}</p>
                        {!clientName && <p className="text-[11px] text-ink-3 mt-1">No third-party client</p>}
                      </td>
                      <td className="px-5 py-4 align-top text-ink-2 text-[12px] whitespace-nowrap">
                        <p>{fmtDate(b.start_date)}</p>
                        <p className="text-[11px] text-ink-3 mt-1">to {fmtDate(b.end_date)}</p>
                      </td>
                      <td className="px-5 py-4 align-top text-ink-3 text-[12px] whitespace-nowrap">{fmtReceived(b.created_at)}</td>
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>{b.status}</span>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Link href={`/vendor/bookings/${b.id}`} className="inline-flex items-center gap-1 text-accent hover:text-accent-dark font-semibold text-[12.5px] whitespace-nowrap">Open <PortalIcon name="arrow-up-right" size={14} /></Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border text-[11px] text-ink-3">Sorted by {sort === 'start_date' ? 'start date' : sort === 'created_at' ? 'received date' : sort === 'public_id' ? 'reference' : sort === 'vehicle' ? 'vehicle / service' : 'client / passenger'} · {direction === 'asc' ? 'ascending' : 'descending'}</div>
        </div>
      )}
    </div>
  )
}

function SortableHeader({ label, field, activeSort, direction, status }: { label: string; field: SortField; activeSort: SortField; direction: SortDirection; status: string }) {
  const active = field === activeSort
  return (
    <th className="text-left">
      <Link href={sortHref(status, activeSort, direction, field)} className="flex items-center gap-1.5 px-5 py-3 hover:text-ink hover:bg-accent/[0.05] transition-colors" aria-label={`Sort by ${label}`}>
        <span>{label}</span>
        <PortalIcon name={active ? (direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevrons-up-down'} size={13} />
      </Link>
    </th>
  )
}
