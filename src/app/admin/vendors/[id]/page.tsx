import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query, queryOne } from '@/lib/db'
import { adminGetVehicles } from '@/lib/api'
import VendorDetailTabs from './VendorDetailTabs'
import type { Metadata } from 'next'

export const revalidate = 0

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await queryOne<{ name: string }>('SELECT name FROM Vendor WHERE id = ? LIMIT 1', [params.id])
  return { title: v?.name ?? 'Vendor' }
}

export default async function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  const [rawVendor, allVehicles] = await Promise.all([
    queryOne<{ id: string; name: string; public_id: string; username: string; contact_email: string; contact_phone: string; is_active: number }>(
      'SELECT id, name, public_id, username, contact_email, contact_phone, is_active FROM Vendor WHERE id = ? LIMIT 1',
      [params.id]
    ),
    adminGetVehicles(),
  ])

  if (!rawVendor) notFound()

  const [vendorVehicles, clients, bookings, bookingCount, clientCount] = await Promise.all([
    query<{ vendor_id: string; vehicle_id: string; is_enabled: number; vname: string; vchauffeur_price: number }>(
      'SELECT vv.vendor_id, vv.vehicle_id, vv.is_enabled, v.id as vid, v.name as vname, v.chauffeur_price as vchauffeur_price, v.slug, v.is_available FROM VendorVehicle vv JOIN Vehicle v ON vv.vehicle_id = v.id WHERE vv.vendor_id = ?',
      [params.id]
    ),
    query<{ id: string; name: string; email: string; phone: string; reference: string }>('SELECT id, name, email, phone, reference FROM VendorClient WHERE vendor_id = ? AND is_active = 1 ORDER BY name ASC LIMIT 50', [params.id]),
    query<{ id: string; public_id: string; status: string; start_date: string; end_date: string; vehicle_name?: string; vendor_client_name?: string; [k: string]: unknown }>(
      'SELECT b.id, b.public_id, b.status, b.start_date, b.end_date, b.total_cost, b.created_at, v.name as vehicle_name, vc.name as vendor_client_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id WHERE b.vendor_id = ? ORDER BY b.created_at DESC LIMIT 20',
      [params.id]
    ),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE vendor_id = ?', [params.id]),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM VendorClient WHERE vendor_id = ?', [params.id]),
  ])

  // Attach first media item
  const vehicleIds = vendorVehicles.map((vv) => vv.vehicle_id)
  let firstMedia: { vehicle_id: string; url: string }[] = []
  if (vehicleIds.length > 0) {
    firstMedia = await query<{ vehicle_id: string; url: string }>(
      'SELECT vehicle_id, url FROM VehicleMedia WHERE vehicle_id IN (?) AND sort_order = 0',
      [vehicleIds]
    )
  }

  const vendor = {
    ...rawVendor,
    is_active: Boolean(rawVendor.is_active),
    vehicles: vendorVehicles.map((vv) => ({
      vendor_id: vv.vendor_id,
      vehicle_id: vv.vehicle_id,
      is_enabled: Boolean(vv.is_enabled),
      vehicle: {
        id: (vv as { vid?: string }).vid ?? vv.vehicle_id,
        name: vv.vname,
        chauffeur_price: vv.vchauffeur_price,
        media: firstMedia.filter((m) => m.vehicle_id === vv.vehicle_id),
      },
    })),
    clients,
    bookings: bookings.map(b => ({
      id: b.id,
      public_id: b.public_id,
      status: b.status,
      start_date: b.start_date,
      end_date: b.end_date,
      vehicle: b.vehicle_name ? { name: b.vehicle_name } : null,
      vendor_client: b.vendor_client_name ? { name: b.vendor_client_name } : null,
      contact_name: (b as { contact_name?: string | null }).contact_name ?? null,
    })),
    _count: { bookings: bookingCount?.count ?? 0, clients: clientCount?.count ?? 0 },
  }

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
