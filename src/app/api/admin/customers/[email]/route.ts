import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = decodeURIComponent(params.email)

  const [bookings, notes] = await Promise.all([
    query<{
      id: string; public_id: string; status: string; hire_type: string;
      start_date: string; end_date: string; total_days: number;
      daily_rate: number; total_cost: number; contact_name: string | null;
      contact_phone: string; vehicle_name: string | null; created_at: Date;
    }>(
      `SELECT b.id, b.public_id, b.status, b.hire_type, b.start_date, b.end_date,
              b.total_days, b.daily_rate, b.total_cost, b.contact_name, b.contact_phone,
              v.name as vehicle_name, b.created_at
       FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       WHERE b.contact_email = ?
       ORDER BY b.created_at DESC`,
      [email]
    ),
    query<{ id: string; text: string; created_at: Date }>(
      'SELECT id, text, created_at FROM CustomerNote WHERE contact_email = ? ORDER BY created_at DESC',
      [email]
    ),
  ])

  return NextResponse.json({
    bookings: bookings.map(b => ({
      ...b,
      daily_rate: b.daily_rate / 100,
      total_cost: b.total_cost / 100,
      created_at: b.created_at instanceof Date ? b.created_at.toISOString() : String(b.created_at),
    })),
    notes: notes.map(n => ({
      ...n,
      created_at: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
    })),
  })
}
