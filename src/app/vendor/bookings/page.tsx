import Link from 'next/link'
import { getVendorSession } from '@/lib/vendor-auth'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import VendorBookingsList from './VendorBookingsList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bookings' }
export const revalidate = 0

export default async function VendorBookingsPage() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const rows = await query<{
    vehicle_name?: string; vendor_client_name?: string;
    [k: string]: unknown
  }>(
    `SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
     WHERE b.vendor_id = ?
        OR b.vehicle_id IN (
          SELECT vehicle_id FROM VendorVehicle WHERE vendor_id = ? AND is_enabled = 1
        )
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [session.vendorId, session.vendorId]
  )
  const bookings = rows.map(b => ({
    ...b,
    vehicle: b.vehicle_name ? { name: b.vehicle_name } : null,
    vendor_client: b.vendor_client_name ? { name: b.vendor_client_name } : null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Bookings</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/vendor/bookings/new/multi"
            className="border border-border text-ink font-semibold text-[13.5px] px-4 py-2.5 rounded-[6px] hover:border-accent hover:text-accent transition-colors">
            Book Multiple
          </Link>
          <Link href="/vendor/bookings/new"
            className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
            + New Booking
          </Link>
        </div>
      </div>
      <VendorBookingsList bookings={bookings as Parameters<typeof VendorBookingsList>[0]['bookings']} />
    </div>
  )
}
