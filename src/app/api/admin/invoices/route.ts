import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM Invoice WHERE booking_id = ? LIMIT 1', [booking_id]
  )
  if (existing) return NextResponse.json({ error: 'Invoice already exists for this booking' }, { status: 409 })

  const booking = await queryOne<{ id: string; total_cost: number; currency: string }>(
    'SELECT id, total_cost, currency FROM Booking WHERE id = ? LIMIT 1', [booking_id]
  )
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const id = newId()
  const public_id = await generatePublicId('INV')

  await execute(
    'INSERT INTO Invoice (id, public_id, booking_id, amount, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [id, public_id, booking_id, booking.total_cost, booking.currency ?? 'AUD', 'draft']
  )

  return NextResponse.json({ id, public_id })
}
