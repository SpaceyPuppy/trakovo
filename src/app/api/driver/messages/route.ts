import { NextRequest, NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { query, queryOne, execute, newId } from '@/lib/db'

export async function GET() {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const messages = await query(
    'SELECT * FROM DriverMessage WHERE driver_id = ? ORDER BY created_at DESC',
    [session.driverId]
  )
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { subject, message, booking_id } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
  }

  const id = newId()
  await execute(
    'INSERT INTO DriverMessage (id, driver_id, subject, message, booking_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [id, session.driverId, subject.trim(), message.trim(), booking_id || null, 'open']
  )
  const msg = await queryOne('SELECT * FROM DriverMessage WHERE id = ? LIMIT 1', [id])
  return NextResponse.json(msg, { status: 201 })
}
