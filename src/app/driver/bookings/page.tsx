import Link from 'next/link'
import { getDriverSession } from '@/lib/driver-auth'
import { prisma } from '@/lib/db'
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

export default async function DriverBookingsPage() {
  const session = await getDriverSession()
  if (!session) redirect('/driver/login')

  const bookings = await prisma.booking.findMany({
    where: { driver_id: session.driverId },
    orderBy: { start_date: 'asc' },
    include: { vehicle: { select: { name: true } } },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">My Bookings</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">{bookings.length} trip{bookings.length !== 1 ? 's' : ''} assigned to you</p>
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
              <tr>{['Reference', 'Vehicle', 'Start', 'End', 'Status', ''].map(h => <th key={h} className="text-left px-6 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[12.5px] font-bold text-accent">{b.public_id}</td>
                  <td className="px-6 py-4 text-ink-3">{b.vehicle?.name ?? '—'}</td>
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
    </div>
  )
}
