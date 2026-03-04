import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { adminGetVehicles } from '@/lib/api'
import VendorDetailTabs from './VendorDetailTabs'
import type { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await prisma.vendor.findUnique({ where: { id: params.id }, select: { name: true } })
  return { title: v?.name ?? 'Vendor' }
}

export default async function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  const [vendor, allVehicles] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        vehicles: {
          include: {
            vehicle: { include: { media: { take: 1, orderBy: { sort_order: 'asc' } } } },
          },
        },
        clients: { where: { is_active: true }, orderBy: { name: 'asc' }, take: 50 },
        bookings: {
          orderBy: { created_at: 'desc' },
          take: 20,
          include: {
            vehicle: { select: { name: true } },
            vendor_client: { select: { name: true } },
          },
        },
        _count: { select: { bookings: true, clients: true } },
      },
    }),
    adminGetVehicles(),
  ])

  if (!vendor) notFound()

  return (
    <div className="px-10 py-10">
      <div className="mb-8">
        <Link href="/admin/vendors" className="text-[13px] text-ink-3 hover:text-ink mb-3 inline-block">← Back to Vendors</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-[26px] tracking-tight">{vendor.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[13px] text-ink-3 font-mono">{vendor.public_id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${vendor.is_active ? 'bg-success-bg text-success border-success/30' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="text-right text-[13px] text-ink-3">
            <p><span className="font-semibold text-ink">{vendor._count.bookings}</span> bookings</p>
            <p><span className="font-semibold text-ink">{vendor._count.clients}</span> clients</p>
          </div>
        </div>
      </div>

      <VendorDetailTabs vendor={vendor} allVehicles={allVehicles} />
    </div>
  )
}
