import Link from 'next/link'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne } from '@/lib/db'
import { redirect } from 'next/navigation'
import VendorBookingsList from './bookings/VendorBookingsList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface Props {
  searchParams?: { page?: string; status?: string; sort?: string; direction?: string }
}

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const
type StatusFilter = typeof STATUS_FILTERS[number]
const SORT_FIELDS = ['start_date', 'public_id', 'created_at', 'contact_name', 'vehicle'] as const
type SortField = typeof SORT_FIELDS[number]

export default async function VendorDashboard({ searchParams }: Props) {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const status = STATUS_FILTERS.includes(searchParams?.status as StatusFilter)
    ? searchParams?.status as StatusFilter
    : 'all'
  const requestedPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (page - 1) * PAGE_SIZE
  const sort = SORT_FIELDS.includes(searchParams?.sort as SortField)
    ? searchParams?.sort as SortField
    : 'start_date'
  const direction = searchParams?.direction === 'desc' ? 'desc' : 'asc'
  const sortColumns: Record<SortField, string> = {
    start_date: 'b.start_date',
    public_id: 'b.public_id',
    created_at: 'b.created_at',
    contact_name: 'COALESCE(vc.name, b.contact_name, \'\')',
    vehicle: 'COALESCE(v.name, b.service_type, \'\')',
  }

  const [stats, allBookings] = await Promise.all([
    queryOne<{
      total_bookings: number | string
      bookings_this_month: number | string
      pending_bookings: number | string
      confirmed_bookings: number | string
      completed_bookings: number | string
      cancelled_bookings: number | string
      active_clients: number | string
    }>(
      `SELECT
         COUNT(*) AS total_bookings,
         COALESCE(SUM(CASE WHEN b.created_at >= ? THEN 1 ELSE 0 END), 0) AS bookings_this_month,
         COALESCE(SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_bookings,
         (SELECT COUNT(*) FROM VendorClient vc WHERE vc.vendor_id = ? AND vc.is_active = 1) AS active_clients
       FROM Booking b
       WHERE b.vendor_id = ?`,
      [startOfMonth, session.vendorId, session.vendorId]
    ),
    query<{
      id: string; public_id: string; status: string; service_type: string | null;
      start_date: string; end_date: string; total_days: number; total_cost: number;
      contact_name: string | null; created_at: string | Date; vehicle_name?: string; vendor_client_name?: string;
      [k: string]: unknown
    }>(
      `SELECT b.id, b.public_id, b.status, b.service_type, b.start_date, b.end_date,
              b.total_days, b.total_cost, b.contact_name, b.created_at,
              v.name AS vehicle_name, vc.name AS vendor_client_name
       FROM Booking b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
       WHERE b.vendor_id = ?
       ${status === 'all' ? '' : 'AND b.status = ?'}
       ORDER BY ${sortColumns[sort]} ${direction.toUpperCase()}, b.public_id ASC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      status === 'all' ? [session.vendorId] : [session.vendorId, status]
    ),
  ])
  const totalBookings = Number(stats?.total_bookings ?? 0)
  const bookingsThisMonth = Number(stats?.bookings_this_month ?? 0)
  const pendingCount = Number(stats?.pending_bookings ?? 0)
  const clientCount = Number(stats?.active_clients ?? 0)
  const totalsByStatus: Record<StatusFilter, number> = {
    all: totalBookings,
    pending: pendingCount,
    confirmed: Number(stats?.confirmed_bookings ?? 0),
    completed: Number(stats?.completed_bookings ?? 0),
    cancelled: Number(stats?.cancelled_bookings ?? 0),
  }
  const filteredTotal = totalsByStatus[status]
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE))

  const bookings = allBookings.map(b => ({
    ...b,
    vehicle: b.vehicle_name ? { name: b.vehicle_name } : null,
    vendor_client: b.vendor_client_name ? { name: b.vendor_client_name } : null,
  }))

  return (
    <div>
      {/* Header with title and CTA */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Welcome back, {session.vendorName}</h1>
        </div>
        <div>
          <Link href="/vendor/bookings/new/multi"
            className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
            + Bookings
          </Link>
        </div>
      </div>

      {/* Compact stat bar */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <Link href="/vendor" className="bg-white border border-border rounded-[6px] px-4 py-3 hover:border-accent/50 transition-colors flex-1 min-w-[160px]">
          <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">Bookings This Month</p>
          <p className="font-display font-bold text-[20px] tracking-tight">{bookingsThisMonth}</p>
        </Link>
        <Link href="/vendor" className="bg-white border border-border rounded-[6px] px-4 py-3 hover:border-accent/50 transition-colors flex-1 min-w-[160px]">
          <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">Pending</p>
          <p className="font-display font-bold text-[20px] tracking-tight text-yellow-600">{pendingCount}</p>
        </Link>
        <Link href="/vendor/clients" className="bg-white border border-border rounded-[6px] px-4 py-3 hover:border-accent/50 transition-colors flex-1 min-w-[160px]">
          <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-0.5">Active Clients</p>
          <p className="font-display font-bold text-[20px] tracking-tight">{clientCount}</p>
        </Link>
      </div>

      {/* Full bookings list */}
      <VendorBookingsList
        bookings={bookings as Parameters<typeof VendorBookingsList>[0]['bookings']}
        activeStatus={status}
        sort={sort}
        direction={direction}
      />
      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4 mt-6" aria-label="Bookings pagination">
          {page > 1 ? (
            <Link href={`/vendor?status=${status}&sort=${sort}&direction=${direction}&page=${page - 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Previous
            </Link>
          ) : <span />}
          <span className="text-[12.5px] text-ink-3">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/vendor?status=${status}&sort=${sort}&direction=${direction}&page=${page + 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Next
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  )
}
