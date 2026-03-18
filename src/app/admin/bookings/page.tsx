import Link from 'next/link'
import { adminGetBookings } from '@/lib/api'
import BookingsList from './BookingsList'
import type { Metadata } from 'next'
import type { BookingResponse } from '@/types'

export const metadata: Metadata = { title: 'Bookings' }
export const revalidate = 0

export default async function AdminBookingsPage() {
  let bookings: BookingResponse[] = []
  try { bookings = await adminGetBookings() } catch { /* show empty */ }

  return (
    <div className="px-10 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Bookings</h1>
          <p className="text-[14px] text-ink-3">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/bookings/new"
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-flex items-center gap-2 mt-1">
          + Quick Add
        </Link>
      </div>
      <BookingsList bookings={bookings} />
    </div>
  )
}
