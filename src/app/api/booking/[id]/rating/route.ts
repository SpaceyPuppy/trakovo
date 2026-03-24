import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute, newId } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await req.json() as { stars?: number; comment?: string }

  if (!body.stars || body.stars < 1 || body.stars > 5) {
    return NextResponse.json({ error: 'stars must be 1–5' }, { status: 400 })
  }

  const booking = await queryOne<{ id: string }>('SELECT id FROM Booking WHERE id = ?', [id])
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const existing = await queryOne<{ id: string }>('SELECT id FROM TripRating WHERE booking_id = ?', [id])
  if (existing) return NextResponse.json({ error: 'Already rated' }, { status: 409 })

  await execute(
    'INSERT INTO TripRating (id, booking_id, stars, comment) VALUES (?, ?, ?, ?)',
    [newId(), id, body.stars, body.comment ?? null]
  )

  return NextResponse.json({ ok: true })
}
