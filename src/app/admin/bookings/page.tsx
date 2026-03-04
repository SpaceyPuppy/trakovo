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
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Bookings</h1>
      <p className="text-[14px] text-ink-3 mb-6">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
      <BookingsList bookings={bookings} />
    </div>
  )
}
