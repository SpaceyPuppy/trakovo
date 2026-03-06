import { NextRequest, NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { queryOne, execute, newId } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Confirm this booking belongs to this driver
  const booking = await queryOne('SELECT id FROM Booking WHERE id = ? AND driver_id = ? LIMIT 1', [params.id, session.driverId])
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Note text required' }, { status: 400 })

  const id = newId()
  await execute(
    'INSERT INTO BookingNote (id, booking_id, text, author, created_at) VALUES (?, ?, ?, ?, NOW())',
    [id, params.id, text.trim(), session.driverName]
  )
  const note = await queryOne('SELECT * FROM BookingNote WHERE id = ? LIMIT 1', [id])
  return NextResponse.json(note, { status: 201 })
}
