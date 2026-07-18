import { NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(req.url)
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100
  const offset = (page - 1) * limit

  const bookings = await query(
    `SELECT b.*, v.name as vehicle_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.driver_id = ?
     ORDER BY b.start_date ASC
     LIMIT ${limit} OFFSET ${offset}`,
    [session.driverId]
  )
  return NextResponse.json(bookings)
}
