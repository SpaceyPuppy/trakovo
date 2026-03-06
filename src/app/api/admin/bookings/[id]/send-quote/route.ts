import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { sendCustomerQuote } from '@/lib/email'

interface Context { params: { id: string } }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const note: string | undefined = body.note?.trim() || undefined

    const booking = await queryOne<{
      id: string; public_id: string; status: string; hire_type: string;
      start_date: string; end_date: string; total_days: number;
      daily_rate: number; total_cost: number; vehicle_id: string | null;
      vehicle_name: string | null; contact_name: string | null;
      contact_email: string; contact_phone: string; driver_name: string | null;
      created_at: Date;
    }>(
      'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1',
      [params.id]
    )
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!booking.vehicle_id || !booking.vehicle_name) return NextResponse.json({ error: 'Booking has no vehicle assigned' }, { status: 400 })

    // Build a BookingResponse shape for the email function (values in dollars)
    const bookingForEmail = {
      id: booking.id,
      public_id: booking.public_id,
      status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
      hire_type: booking.hire_type as 'chauffeured' | 'dry-hire',
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_days: booking.total_days,
      daily_rate: booking.daily_rate / 100,
      total_cost: booking.total_cost / 100,
      vehicle: { id: booking.vehicle_id, name: booking.vehicle_name },
      contact_name: booking.contact_name ?? undefined,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      driver_name: booking.driver_name ?? undefined,
      created_at: booking.created_at instanceof Date ? booking.created_at.toISOString() : String(booking.created_at),
    }

    await sendCustomerQuote(bookingForEmail, booking.vehicle_name, note)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
