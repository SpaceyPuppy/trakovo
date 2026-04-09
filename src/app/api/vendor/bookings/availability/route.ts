/**
 * GET /api/vendor/bookings/availability
 * Returns all confirmed/pending bookings that have a vehicle assigned,
 * across ALL vendors and admin bookings — not filtered by vendor.
 * Used by the vendor multi-booking calendar to show global vehicle unavailability.
 */
import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch all bookings with a vehicle that are active (not cancelled/enquiry)
  const bookings = await query<{
    vehicle_id: string
    vehicle_name: string
    start_date: string
    end_date: string
    status: string
  }>(
    `SELECT b.vehicle_id, v.name AS vehicle_name, b.start_date, b.end_date, b.status
     FROM Booking b
     JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.vehicle_id IS NOT NULL
       AND b.status NOT IN ('cancelled', 'enquiry')
     ORDER BY b.start_date ASC`,
    []
  )

  // Also include per-vehicle blockouts as synthetic unavailability entries
  const blockouts = await query<{
    vehicle_id: string
    vehicle_name: string
    start_date: string
    end_date: string
  }>(
    `SELECT vb.vehicle_id, v.name AS vehicle_name, vb.start_date, vb.end_date
     FROM VehicleBlockout vb
     JOIN Vehicle v ON vb.vehicle_id = v.id
     WHERE vb.vehicle_id IS NOT NULL`,
    []
  )

  return NextResponse.json({
    bookings: bookings.map(b => ({
      vehicle_id: b.vehicle_id,
      vehicle_name: b.vehicle_name,
      start_date: typeof b.start_date === 'string' ? b.start_date : new Date(b.start_date).toISOString().slice(0, 10),
      end_date: typeof b.end_date === 'string' ? b.end_date : new Date(b.end_date).toISOString().slice(0, 10),
      status: b.status,
    })),
    blockouts: blockouts.map(b => ({
      vehicle_id: b.vehicle_id,
      vehicle_name: b.vehicle_name,
      start_date: typeof b.start_date === 'string' ? b.start_date : new Date(b.start_date).toISOString().slice(0, 10),
      end_date: typeof b.end_date === 'string' ? b.end_date : new Date(b.end_date).toISOString().slice(0, 10),
    })),
  })
}
