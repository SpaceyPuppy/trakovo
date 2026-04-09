/**
 * Automated email sequences.
 * Event-driven: sendBookingReceived, sendBookingConfirmed
 * Cron-driven:  sendDue24hrReminders, sendFollowups
 *
 * All sends are idempotent — BookingEmailLog prevents duplicate sends.
 */
import { query, queryOne, execute } from './db'
import { sendEmail } from './email'

async function isEmailEnabled(key: string): Promise<boolean> {
  const row = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', [key])
  return row?.value !== '0'
}
import { getTemplate, renderTemplate, buildTemplateContext } from './email-templates'
import type { BookingResponse } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function alreadySent(bookingId: string, templateKey: string): Promise<boolean> {
  const row = await queryOne(
    'SELECT id FROM BookingEmailLog WHERE booking_id = ? AND template_key = ? LIMIT 1',
    [bookingId, templateKey]
  )
  return !!row
}

async function logSent(bookingId: string, templateKey: string): Promise<void> {
  await execute(
    'INSERT IGNORE INTO BookingEmailLog (booking_id, template_key, sent_at) VALUES (?, ?, NOW())',
    [bookingId, templateKey]
  )
}

async function getNotificationEmail(): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM Setting WHERE \`key\` = 'notification_email' LIMIT 1"
  )
  return row?.value?.trim() || null
}

async function loadBooking(bookingId: string): Promise<{ booking: BookingResponse; vehicleName: string } | null> {
  const row = await queryOne<{
    id: string; public_id: string; status: string; hire_type: string;
    start_date: string; end_date: string; total_days: number;
    daily_rate: number; total_cost: number;
    contact_name: string | null; contact_email: string; contact_phone: string;
    driver_name: string | null; driver_dob: string | null;
    driver_licence_number: string | null; driver_licence_expiry: string | null;
    is_enquiry: number; vehicle_name: string | null; created_at: Date;
  }>(
    `SELECT b.*, v.name as vehicle_name
     FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.id = ? LIMIT 1`,
    [bookingId]
  )
  if (!row) return null

  const booking: BookingResponse = {
    id: row.id,
    public_id: row.public_id,
    status: row.status as BookingResponse['status'],
    hire_type: row.hire_type as BookingResponse['hire_type'],
    start_date: row.start_date,
    end_date: row.end_date,
    total_days: row.total_days,
    daily_rate: row.daily_rate / 100,
    total_cost: row.total_cost / 100,
    contact_name: row.contact_name ?? undefined,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    driver_name: row.driver_name ?? undefined,
    driver_dob: row.driver_dob ?? undefined,
    driver_licence_number: row.driver_licence_number ?? undefined,
    driver_licence_expiry: row.driver_licence_expiry ?? undefined,
    is_enquiry: Boolean(row.is_enquiry),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
  return { booking, vehicleName: row.vehicle_name ?? 'Vehicle' }
}

async function sendSequenceEmail(
  bookingId: string,
  templateKey: string,
  booking: BookingResponse,
  vehicleName: string,
  subject: string,
  recipients: string[],
): Promise<void> {
  if (await alreadySent(bookingId, templateKey)) return

  const template = await getTemplate(templateKey as import('./email-template-defaults').TemplateType)
  const { vars, conditions } = await buildTemplateContext(booking, vehicleName)
  const html = renderTemplate(template, vars, conditions)

  await Promise.all(recipients.map(to => sendEmail(to, subject, html)))
  await logSent(bookingId, templateKey)
}

// ─── Event-driven sequences ──────────────────────────────────────────────────

/** Fired immediately when a new booking is submitted. Sends to customer only. */
export async function sendBookingReceived(booking: BookingResponse, vehicleName: string): Promise<void> {
  if (!await isEmailEnabled('email_on_customer_received')) return
  try {
    await sendSequenceEmail(
      booking.id,
      'booking_received',
      booking,
      vehicleName,
      `Booking Request Received — ${booking.public_id}`,
      [booking.contact_email],
    )
  } catch (err) {
    console.error('[email-seq] booking_received failed for', booking.public_id, err)
  }
}

/** Fired when admin sets status to "confirmed". Sends to customer (customer template) + admin (admin template). */
export async function sendBookingConfirmed(bookingId: string): Promise<void> {
  if (!await isEmailEnabled('email_on_booking_confirmed')) return
  try {
    const data = await loadBooking(bookingId)
    if (!data) return

    const subject = `Booking Confirmed — ${data.booking.public_id} — ${data.vehicleName}`

    // Send customer version
    await sendSequenceEmail(bookingId, 'booking_confirmed', data.booking, data.vehicleName, subject, [data.booking.contact_email])

    // Send admin version (separate template key so it doesn't de-dupe with customer send)
    const adminEmail = await getNotificationEmail()
    if (adminEmail) {
      await sendSequenceEmail(bookingId, 'booking_confirmed_admin', data.booking, data.vehicleName, subject, [adminEmail])
    }
  } catch (err) {
    console.error('[email-seq] booking_confirmed failed for', bookingId, err)
  }
}

// ─── Cron-driven sequences ───────────────────────────────────────────────────

/** Run daily. Sends 24hr reminder to customer + admin for tomorrow's confirmed bookings. */
export async function sendDue24hrReminders(): Promise<{ sent: number; errors: number }> {
  if (!await isEmailEnabled('email_on_24hr_reminder')) return { sent: 0, errors: 0 }
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const bookings = await query<{ id: string }>(
    "SELECT id FROM Booking WHERE start_date = ? AND status = 'confirmed'",
    [tomorrowStr]
  )

  let sent = 0; let errors = 0
  for (const { id } of bookings) {
    try {
      const data = await loadBooking(id)
      if (!data) continue

      const subject = `Reminder — Your Booking is Tomorrow — ${data.booking.public_id}`
      await sendSequenceEmail(id, 'reminder_24hr', data.booking, data.vehicleName, subject, [data.booking.contact_email])

      const adminEmail = await getNotificationEmail()
      if (adminEmail) {
        await sendSequenceEmail(id, 'reminder_24hr_admin', data.booking, data.vehicleName, subject, [adminEmail])
      }
      sent++
    } catch (err) {
      console.error('[email-seq] reminder_24hr failed for', id, err)
      errors++
    }
  }
  return { sent, errors }
}

/** Run daily. Sends follow-up to customer + admin for bookings that ended yesterday. */
export async function sendFollowups(): Promise<{ sent: number; errors: number }> {
  if (!await isEmailEnabled('email_on_followup')) return { sent: 0, errors: 0 }
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const bookings = await query<{ id: string }>(
    "SELECT id FROM Booking WHERE end_date = ? AND status IN ('confirmed', 'completed')",
    [yesterdayStr]
  )

  let sent = 0; let errors = 0
  for (const { id } of bookings) {
    try {
      const data = await loadBooking(id)
      if (!data) continue

      const subject = `Thank You for Your Booking — ${data.booking.public_id}`
      await sendSequenceEmail(id, 'followup', data.booking, data.vehicleName, subject, [data.booking.contact_email])

      const adminEmail = await getNotificationEmail()
      if (adminEmail) {
        await sendSequenceEmail(id, 'followup_admin', data.booking, data.vehicleName, subject, [adminEmail])
      }
      sent++
    } catch (err) {
      console.error('[email-seq] followup failed for', id, err)
      errors++
    }
  }
  return { sent, errors }
}
