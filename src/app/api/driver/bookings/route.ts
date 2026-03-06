import { NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const bookings = await query(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.driver_id = ? ORDER BY b.start_date ASC',
    [session.driverId]
  )
  return NextResponse.json(bookings)
}
