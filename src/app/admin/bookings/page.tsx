import Link from 'next/link'
import {
  adminGetBookingCount,
  adminGetBookings,
  type AdminBookingStatusFilter,
} from '@/lib/api'
import BookingsList from './BookingsList'
import type { Metadata } from 'next'
import type { BookingResponse } from '@/types'

export const metadata: Metadata = { title: 'Bookings' }
export const revalidate = 0

const PAGE_SIZE = 50

interface Props {
  searchParams?: { page?: string; status?: string }
}

const STATUS_FILTERS: AdminBookingStatusFilter[] = [
  'all', 'pending', 'confirmed', 'enquiry', 'completed', 'cancelled',
]

export default async function AdminBookingsPage({ searchParams }: Props) {
  const status = STATUS_FILTERS.includes(searchParams?.status as AdminBookingStatusFilter)
    ? searchParams?.status as AdminBookingStatusFilter
    : 'all'
  const requestedPage = Number.parseInt(searchParams?.page ?? '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  let bookings: BookingResponse[] = []
  let total = 0
  try {
    [bookings, total] = await Promise.all([
      adminGetBookings({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status }),
      adminGetBookingCount(status),
    ])
  } catch { /* show empty */ }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstShown = bookings.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastShown = bookings.length > 0 ? firstShown + bookings.length - 1 : 0

  return (
    <div className="px-10 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Bookings</h1>
          <p className="text-[14px] text-ink-3">
            {total} {status === 'all' ? 'total' : status} booking{total !== 1 ? 's' : ''}
            {total > PAGE_SIZE && ` | showing ${firstShown}-${lastShown}`}
          </p>
        </div>
        <Link href="/admin/bookings/new"
          className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-flex items-center gap-2 mt-1">
          + Quick Add
        </Link>
      </div>
      <BookingsList bookings={bookings} activeStatus={status} />
      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4 mt-6" aria-label="Bookings pagination">
          {page > 1 ? (
            <Link href={`/admin/bookings?status=${status}&page=${page - 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Previous
            </Link>
          ) : <span />}
          <span className="text-[12.5px] text-ink-3">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/admin/bookings?status=${status}&page=${page + 1}`} className="text-[13px] font-semibold text-accent hover:underline">
              Next
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  )
}
