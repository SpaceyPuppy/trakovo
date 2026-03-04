import Link from 'next/link'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import VendorBookingsList from './VendorBookingsList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bookings' }
export const revalidate = 0

export default async function VendorBookingsPage() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const bookings = await prisma.booking.findMany({
    where: { vendor_id: session.vendorId },
    orderBy: { created_at: 'desc' },
    include: {
      vehicle: { select: { name: true } },
      vendor_client: { select: { name: true } },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Bookings</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/vendor/bookings/new"
          className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors">
          + New Booking
        </Link>
      </div>
      <VendorBookingsList bookings={bookings as Parameters<typeof VendorBookingsList>[0]['bookings']} />
    </div>
  )
}
