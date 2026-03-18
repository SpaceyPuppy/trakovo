import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const customers = await query<{
    contact_email: string
    contact_name: string | null
    contact_phone: string | null
    total_bookings: number
    total_spend: number
    first_booking: Date
    last_booking: Date
  }>(
    `SELECT
      contact_email,
      MAX(contact_name) as contact_name,
      MAX(contact_phone) as contact_phone,
      COUNT(*) as total_bookings,
      SUM(total_cost) as total_spend,
      MIN(created_at) as first_booking,
      MAX(created_at) as last_booking
     FROM Booking
     WHERE contact_email != '' AND contact_email IS NOT NULL
     GROUP BY contact_email
     ORDER BY last_booking DESC`
  )

  return NextResponse.json(customers.map(c => ({
    ...c,
    total_spend: c.total_spend / 100,
    first_booking: c.first_booking instanceof Date ? c.first_booking.toISOString() : String(c.first_booking),
    last_booking: c.last_booking instanceof Date ? c.last_booking.toISOString() : String(c.last_booking),
  })))
}
