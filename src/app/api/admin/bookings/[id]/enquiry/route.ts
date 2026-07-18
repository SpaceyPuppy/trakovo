import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { BookingValidationError } from '@/lib/booking-availability'
import {
  AdminBookingMutationError,
  markAdminEnquiryNotified,
  prepareAdminEnquiryNotification,
  runBookingMutationSideEffects,
  updateAdminEnquiry,
} from '@/lib/admin-booking-mutations'
import { sendEmail } from '@/lib/email'
import { buildTemplateContext, getTemplate, renderTemplate } from '@/lib/email-templates'
import type { BookingResponse } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AdminBookingMutationError('Invalid JSON body', 400)
    }
    const action = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).action
      : undefined

    if (action === 'notify') {
      const booking = await prepareAdminEnquiryNotification(params.id)
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
        created_at: booking.created_at instanceof Date
          ? booking.created_at.toISOString()
          : String(booking.created_at),
      }
      const vehicleName = booking.vehicle_name ?? 'Vehicle'

      try {
        const template = await getTemplate('enquiry_available')
        const { vars, conditions } = await buildTemplateContext(bookingResponse, vehicleName)
        const html = renderTemplate(template, vars, conditions)
        await sendEmail(
          booking.contact_email,
          `Good News — ${vehicleName} Is Now Available`,
          html
        )
      } catch (error) {
        console.error('[admin-booking] enquiry notification failed', error)
        throw new AdminBookingMutationError(
          'The enquiry was not changed because the notification could not be sent',
          502
        )
      }

      await markAdminEnquiryNotified(params.id)
      return NextResponse.json({ ok: true })
    }

    const updated = await updateAdminEnquiry(params.id, action)
    void runBookingMutationSideEffects(updated.sideEffects)
    if (updated.converted) return NextResponse.json({ ok: true, converted: true })
    return NextResponse.json({ ok: true, enquiry_status: updated.enquiry_status })
  } catch (error: unknown) {
    if (error instanceof AdminBookingMutationError || error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin-booking] enquiry update failed', error)
    return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 })
  }
}
