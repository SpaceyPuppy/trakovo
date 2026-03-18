import Link from 'next/link'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default async function VendorDashboard() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const vendorFilter = `(b.vendor_id = ? OR b.vehicle_id IN (SELECT vehicle_id FROM VendorVehicle WHERE vendor_id = ? AND is_enabled = 1))`

  const [bookingsThisMonthRow, pendingCountRow, clientCountRow, recentBookings] = await Promise.all([
    queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT b.id) as count FROM Booking b WHERE ${vendorFilter} AND b.created_at >= ?`,
      [session.vendorId, session.vendorId, startOfMonth]
    ),
    queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT b.id) as count FROM Booking b WHERE ${vendorFilter} AND b.status = ?`,
      [session.vendorId, session.vendorId, 'pending']
    ),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM VendorClient WHERE vendor_id = ? AND is_active = 1', [session.vendorId]),
    query(
      `SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name
       FROM Booking b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
       WHERE ${vendorFilter}
       GROUP BY b.id
       ORDER BY b.created_at DESC LIMIT 5`,
      [session.vendorId, session.vendorId]
    ),
  ])
  const bookingsThisMonth = bookingsThisMonthRow?.count ?? 0
  const pendingCount = pendingCountRow?.count ?? 0
  const clientCount = clientCountRow?.count ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Dashboard</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Welcome back, {session.vendorName}</p>
      </div>

      {/* Stats + CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/vendor/bookings" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Bookings This Month</p>
          <p className="font-display font-extrabold text-[32px] tracking-tight">{bookingsThisMonth}</p>
        </Link>
        <Link href="/vendor/bookings" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Pending Confirmation</p>
          <p className="font-display font-extrabold text-[32px] tracking-tight text-yellow-600">{pendingCount}</p>
        </Link>
        <Link href="/vendor/clients" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Active Clients</p>
          <p className="font-display font-extrabold text-[32px] tracking-tight">{clientCount}</p>
        </Link>
        <div className="bg-accent rounded-xl px-6 py-5 flex flex-col justify-between">
          <p className="text-white/70 text-[13px] font-semibold mb-3">Need transport for a client?</p>
          <Link href="/vendor/bookings/new"
            className="bg-white text-accent font-display font-bold text-[13.5px] px-4 py-2.5 rounded-[6px] hover:bg-accent-bg transition-colors text-center">
            + New Booking
          </Link>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg flex items-center justify-between">
          <h2 className="font-display font-bold text-[14px]">Recent Bookings</h2>
          <Link href="/vendor/bookings" className="text-[12.5px] text-accent hover:underline">View all →</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-ink-3 text-[14px] mb-4">No bookings yet.</p>
            <Link href="/vendor/bookings/new" className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
              Create first booking →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Reference', 'Vehicle', 'Client', 'Dates', 'Status'].map(h => <th key={h} className="text-left px-6 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                  <td className="px-6 py-3">
                    <Link href={`/vendor/bookings/${b.id}`} className="font-mono text-[12.5px] font-bold text-accent hover:underline">{b.public_id}</Link>
                  </td>
                  <td className="px-6 py-3 text-ink-3">
                    {(b as { vehicle_name?: string }).vehicle_name ?? ((b as { service_type?: string }).service_type === 'taxi' ? 'Taxi' : (b as { service_type?: string }).service_type === 'cpv' ? 'CPV' : '—')}
                  </td>
                  <td className="px-6 py-3 text-ink-3">{(b as { vendor_client_name?: string }).vendor_client_name ?? (b as { contact_name?: string }).contact_name ?? '—'}</td>
                  <td className="px-6 py-3 text-ink-3 text-[12px]">{b.start_date} → {b.end_date}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                      {b.status}
                    </span>
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
