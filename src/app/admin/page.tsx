import { getAdminSession } from '@/lib/auth'
import { adminGetVehicles, adminGetBookings } from '@/lib/api'
import Link from 'next/link'
import type { Vehicle, BookingResponse } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const session = await getAdminSession()

  let vehicles: Vehicle[] = [], bookings: BookingResponse[] = []
  try {
    [vehicles, bookings] = await Promise.all([
      adminGetVehicles(),
      adminGetBookings({ limit: 5 }).catch(() => []),
    ])
  } catch { /* show zeroes */ }

  const pending = bookings.filter((b: {status: string}) => b.status === 'pending').length
  const available = vehicles.filter((v: {is_available: boolean}) => v.is_available).length

  return (
    <div className="px-10 py-10">
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Dashboard</h1>
      <p className="text-[14px] text-ink-3 mb-8">Welcome back{session?.username ? `, ${session.username}` : ''}.</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        {[
          { label: 'Total Vehicles', value: vehicles.length, sub: `${available} available`, href: '/admin/vehicles' },
          { label: 'Total Bookings', value: bookings.length, sub: `${pending} pending`, href: '/admin/bookings' },
          { label: 'Pending Review', value: pending, sub: 'Require confirmation', href: '/admin/bookings' },
        ].map(({ label, value, sub, href }) => (
          <Link key={label} href={href} className="bg-white border border-border rounded-xl px-6 py-5 hover:shadow-card transition-shadow">
            <p className="text-[12px] font-semibold text-ink-4 uppercase tracking-wider mb-2">{label}</p>
            <p className="font-display font-bold text-[32px] tracking-tight">{value}</p>
            <p className="text-[13px] text-ink-3 mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold text-[16px]">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-[13px] text-accent hover:underline">View all →</Link>
        </div>
        {bookings.length === 0 ? (
          <p className="px-6 py-8 text-[14px] text-ink-3">No bookings yet.</p>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>{['Reference','Vehicle','Type','Dates','Status'].map(h => <th key={h} className="text-left px-6 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.public_id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-semibold text-accent">{b.public_id}</td>
                  <td className="px-6 py-3.5">
                    {b.vehicle?.name ?? (b.service_type === 'taxi' ? 'Taxi' : b.service_type === 'cpv' ? 'CPV' : '—')}
                  </td>
                  <td className="px-6 py-3.5 capitalize">
                    {b.vendor_name
                      ? b.service_type === 'taxi' ? 'B2B – Taxi'
                      : b.service_type === 'cpv'  ? 'B2B – CPV'
                      : 'B2B Vehicle'
                      : b.hire_type?.replace('-', ' ')
                    }
                  </td>
                  <td className="px-6 py-3.5 text-ink-3">{b.start_date} → {b.end_date}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={b.status} />
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-success-bg text-success border-success/30',
    completed: 'bg-[#e8f0fe] text-[#1a56db] border-[#c3d8fb]',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${styles[status] ?? 'bg-bg text-ink-3 border-border'}`}>
      {status}
    </span>
  )
}
