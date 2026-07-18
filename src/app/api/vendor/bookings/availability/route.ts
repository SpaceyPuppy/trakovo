/**
 * GET /api/vendor/bookings/availability
 * Returns all confirmed/pending bookings that have a vehicle assigned,
 * across ALL vendors and admin bookings — not filtered by vendor.
 * Used by the vendor multi-booking calendar to show global vehicle unavailability.
 */
import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import {
  getBookingCalendarWindow,
  getVendorBookingCalendarData,
} from '@/lib/vendor-booking-calendar'

export async function GET(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const window = getBookingCalendarWindow(req.url)
    return NextResponse.json(await getVendorBookingCalendarData(session.vendorId, window))
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[vendor-booking-availability]', error)
    return NextResponse.json({ error: 'Unable to load availability' }, { status: 500 })
  }
}
