import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { getTemplate, renderTemplate, buildTemplateContext } from '@/lib/email-templates'
import type { BookingResponse } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { action } = await req.json() as { action: 'contacted' | 'converted' | 'lost' | 'notify' }

  const booking = await queryOne<{
    id: string; public_id: string; status: string; hire_type: string; is_enquiry: number;
    start_date: string; end_date: string; total_days: number; daily_rate: number; total_cost: number;
    contact_name: string | null; contact_email: string; contact_phone: string;
    driver_name: string | null; driver_dob: string | null;
    driver_licence_number: string | null; driver_licence_expiry: string | null;
    vehicle_name: string | null; created_at: Date;
  }>(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1',
    [params.id]
  )

  if (!booking || !booking.is_enquiry) {
    return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
  }

  if (action === 'contacted') {
    await execute('UPDATE Booking SET enquiry_status = ? WHERE id = ?', ['contacted', params.id])
    return NextResponse.json({ ok: true, enquiry_status: 'contacted' })
  }

  if (action === 'converted') {
    await execute(
      "UPDATE Booking SET is_enquiry = 0, status = 'pending', enquiry_status = 'converted' WHERE id = ?",
      [params.id]
    )
    return NextResponse.json({ ok: true, converted: true })
  }

  if (action === 'lost') {
    await execute('UPDATE Booking SET enquiry_status = ? WHERE id = ?', ['lost', params.id])
    return NextResponse.json({ ok: true, enquiry_status: 'lost' })
  }

  if (action === 'notify') {
    const bookingResponse: BookingResponse = {
      id: booking.id,
      public_id: booking.public_id,
      status: booking.status as BookingResponse['status'],
      hire_type: booking.hire_type as BookingResponse['hire_type'],
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_days: booking.total_days,
      daily_rate: booking.daily_rate / 100,
      total_cost: booking.total_cost / 100,
      contact_name: booking.contact_name ?? undefined,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      driver_name: booking.driver_name ?? undefined,
      driver_dob: booking.driver_dob ?? undefined,
      driver_licence_number: booking.driver_licence_number ?? undefined,
      driver_licence_expiry: booking.driver_licence_expiry ?? undefined,
      created_at: booking.created_at instanceof Date ? booking.created_at.toISOString() : String(booking.created_at),
    }

    const vehicleName = booking.vehicle_name ?? 'Vehicle'
    const template = await getTemplate('enquiry_available')
    const { vars, conditions } = await buildTemplateContext(bookingResponse, vehicleName)
    const html = renderTemplate(template, vars, conditions)

    await sendEmail(
      booking.contact_email,
      `Good News — ${vehicleName} Is Now Available`,
      html
    )

    await execute("UPDATE Booking SET enquiry_status = 'contacted' WHERE id = ? AND enquiry_status = 'new'", [params.id])

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
