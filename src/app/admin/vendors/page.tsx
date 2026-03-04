import Link from 'next/link'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vendors' }
export const revalidate = 0

export default async function AdminVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { bookings: true, clients: true } } },
  })

  return (
    <div className="px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Vendors</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{vendors.length} B2B partner{vendors.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/vendors/new"
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors flex items-center gap-2">
          + Add Vendor
        </Link>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-8 py-16 text-center">
          <p className="text-[32px] mb-3">🏢</p>
          <p className="font-display font-bold text-[18px] mb-2">No vendors yet</p>
          <p className="text-[14px] text-ink-3 mb-6">Add your first B2B partner to get started.</p>
          <Link href="/admin/vendors/new"
            className="bg-accent text-white font-semibold text-[14px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-block">
            + Add Vendor
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                {['Organisation', 'Username', 'Contact', 'Status', 'Activity', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-ink">{v.name}</p>
                    <p className="text-[12px] text-ink-4">{v.public_id}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-[12.5px] text-ink-3">{v.username}</td>
                  <td className="px-6 py-4">
                    {v.contact_email ? <p className="text-ink-3">{v.contact_email}</p> : <p className="text-ink-4">—</p>}
                    {v.contact_phone && <p className="text-[12px] text-ink-4">{v.contact_phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.is_active ? 'bg-success-bg text-success border-success/30' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink-3 text-[12.5px]">
                    <span className="font-semibold text-ink">{v._count.bookings}</span> bookings · <span className="font-semibold text-ink">{v._count.clients}</span> clients
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/vendors/${v.id}`} className="text-accent hover:underline font-medium text-[13px]">View →</Link>
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
