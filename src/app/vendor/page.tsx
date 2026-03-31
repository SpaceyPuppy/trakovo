import Link from 'next/link'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne } from '@/lib/db'
import { redirect } from 'next/navigation'
import VendorBookingsList from './bookings/VendorBookingsList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function VendorDashboard() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const vendorFilter = `(b.vendor_id = ? OR b.vehicle_id IN (SELECT vehicle_id FROM VendorVehicle WHERE vendor_id = ? AND is_enabled = 1))`

  const [bookingsThisMonthRow, pendingCountRow, clientCountRow, allBookings] = await Promise.all([
    queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT b.id) as count FROM Booking b WHERE ${vendorFilter} AND b.created_at >= ?`,
      [session.vendorId, session.vendorId, startOfMonth]
    ),
    queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT b.id) as count FROM Booking b WHERE ${vendorFilter} AND b.status = ?`,
      [session.vendorId, session.vendorId, 'pending']
    ),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM VendorClient WHERE vendor_id = ? AND is_active = 1', [session.vendorId]),
    query<{
      vehicle_name?: string; vendor_client_name?: string;
      [k: string]: unknown
    }>(
      `SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name
       FROM Booking b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
       WHERE ${vendorFilter}
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [session.vendorId, session.vendorId]
    ),
  ])
  const bookingsThisMonth = bookingsThisMonthRow?.count ?? 0
  const pendingCount = pendingCountRow?.count ?? 0
  const clientCount = clientCountRow?.count ?? 0

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
      <VendorBookingsList bookings={bookings as Parameters<typeof VendorBookingsList>[0]['bookings']} />
    </div>
  )
}
