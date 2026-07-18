import Link from 'next/link'
import { getDriverSession } from '@/lib/driver-auth'
import { query, queryOne } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Bookings' }
export const revalidate = 0

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

const PAGE_SIZE = 50

interface Props {
  searchParams?: { page?: string }
}

export default async function DriverBookingsPage({ searchParams }: Props) {
  const session = await getDriverSession()
  if (!session) redirect('/driver/login')

  const requestedPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (page - 1) * PAGE_SIZE
  const [bookings, totalRow] = await Promise.all([
    query<{ id: string; public_id: string; status: string; start_date: string; end_date: string; vehicle_name?: string; contact_name?: string }>(
      `SELECT b.id, b.public_id, b.status, b.start_date, b.end_date, b.contact_name, v.name AS vehicle_name
       FROM Booking b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       WHERE b.driver_id = ?
       ORDER BY
         CASE WHEN b.end_date >= CURDATE() THEN 0 ELSE 1 END,
         CASE WHEN b.end_date >= CURDATE() THEN b.start_date END ASC,
         CASE WHEN b.end_date < CURDATE() THEN b.start_date END DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      [session.driverId]
    ),
    queryOne<{ count: number | string }>(
      'SELECT COUNT(*) AS count FROM Booking WHERE driver_id = ?',
      [session.driverId]
    ),
  ])
  const total = Number(totalRow?.count ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">My Bookings</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">{total} trip{total !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <p className="font-display font-bold text-[18px] mb-2">No bookings yet</p>
          <p className="text-[14px] text-ink-3">Trips assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Reference', 'Passenger', 'Vehicle', 'Start', 'End', 'Status', ''].map(h => <th key={h} className="text-left px-6 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[12.5px] font-bold text-accent">{b.public_id}</td>
                  <td className="px-6 py-4 font-medium">{b.contact_name ?? '—'}</td>
                  <td className="px-6 py-4 text-ink-3">{b.vehicle_name ?? '—'}</td>
                  <td className="px-6 py-4 text-ink-3">{b.start_date}</td>
                  <td className="px-6 py-4 text-ink-3">{b.end_date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[b.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/driver/bookings/${b.id}`} className="text-accent hover:underline font-medium text-[13px]">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4 mt-6" aria-label="Bookings pagination">
          {page > 1 ? (
            <Link href={`/driver/bookings?page=${page - 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Previous
            </Link>
          ) : <span />}
          <span className="text-[12.5px] text-ink-3">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/driver/bookings?page=${page + 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Next
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  )
}
