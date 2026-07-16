import Link from 'next/link'
import { listDriverSummaries } from '@/lib/repositories/drivers'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Drivers' }
export const revalidate = 0

export default async function AdminDriversPage() {
  const drivers = await listDriverSummaries()

  return (
    <div className="px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Drivers</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} in DriveMaster</p>
        </div>
        <Link href="/admin/drivers/new"
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors flex items-center gap-2">
          + Add Driver
        </Link>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <p className="font-display font-bold text-[18px] mb-2">No drivers yet</p>
          <p className="text-[14px] text-ink-3 mb-6">Add your first driver to assign them to bookings.</p>
          <Link href="/admin/drivers/new"
            className="bg-accent text-white font-semibold text-[14px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-block">
            + Add Driver
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                {['Name', 'Username', 'Contact', 'Status', 'Bookings', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-ink">{d.name}</td>
                  <td className="px-6 py-4 font-mono text-[12.5px] text-ink-3">{d.username}</td>
                  <td className="px-6 py-4">
                    {d.email ? <p className="text-ink-3">{d.email}</p> : <p className="text-ink-4">—</p>}
                    {d.phone && <p className="text-[12px] text-ink-4">{d.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${d.is_active ? 'bg-success-bg text-success border-success/30' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink-3">{d._count.bookings}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/drivers/${d.id}`} className="text-accent hover:underline font-medium text-[13px]">View →</Link>
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
