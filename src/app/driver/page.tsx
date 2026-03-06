import Link from 'next/link'
import { getDriverSession } from '@/lib/driver-auth'
import { query, queryOne } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 0

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export default async function DriverDashboard() {
  const session = await getDriverSession()
  if (!session) redirect('/driver/login')

  const today = new Date().toISOString().slice(0, 10)

  const [upcomingRow, totalRow, openMsgRow, recentBookings] = await Promise.all([
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE driver_id = ? AND start_date >= ? AND status != ?', [session.driverId, today, 'cancelled']),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE driver_id = ?', [session.driverId]),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM DriverMessage WHERE driver_id = ? AND status = ?', [session.driverId, 'open']),
    query<{ id: string; public_id: string; status: string; start_date: string; end_date: string; vehicle_name?: string }>(
      'SELECT b.id, b.public_id, b.status, b.start_date, b.end_date, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.driver_id = ? ORDER BY b.start_date ASC LIMIT 5',
      [session.driverId]
    ),
  ])
  const upcomingCount = upcomingRow?.count ?? 0
  const totalCount = totalRow?.count ?? 0
  const openMessages = openMsgRow?.count ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Dashboard</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Welcome back, {session.driverName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/driver/bookings" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Upcoming Trips</p>
          <p className="font-display font-extrabold text-[32px] tracking-tight">{upcomingCount}</p>
        </Link>
        <Link href="/driver/bookings" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Total Assigned</p>
          <p className="font-display font-extrabold text-[32px] tracking-tight">{totalCount}</p>
        </Link>
        <Link href="/driver/messages" className="bg-white border border-border rounded-xl px-6 py-5 hover:border-accent/50 transition-colors">
          <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Open Messages</p>
          <p className={`font-display font-extrabold text-[32px] tracking-tight ${openMessages > 0 ? 'text-accent' : ''}`}>{openMessages}</p>
        </Link>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg flex items-center justify-between">
          <h2 className="font-display font-bold text-[14px]">Your Bookings</h2>
          <Link href="/driver/bookings" className="text-[12.5px] text-accent hover:underline">View all →</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-ink-3 text-[14px]">No bookings assigned yet.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Reference', 'Vehicle', 'Start Date', 'End Date', 'Status'].map(h => <th key={h} className="text-left px-6 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id} className="border-t border-border hover:bg-bg/50">
                  <td className="px-6 py-3">
                    <Link href={`/driver/bookings/${b.id}`} className="font-mono text-[12.5px] font-bold text-accent hover:underline">{b.public_id}</Link>
                  </td>
                  <td className="px-6 py-3 text-ink-3">{b.vehicle_name ?? '—'}</td>
                  <td className="px-6 py-3 text-ink-3">{b.start_date}</td>
                  <td className="px-6 py-3 text-ink-3">{b.end_date}</td>
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
