import { NextRequest, NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { queryOne, query } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const booking = await queryOne(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? AND b.driver_id = ? LIMIT 1',
    [params.id, session.driverId]
  )
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const notes = await query('SELECT * FROM BookingNote WHERE booking_id = ? ORDER BY created_at ASC', [params.id])
  return NextResponse.json({ ...booking, notes })
}
