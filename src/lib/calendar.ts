import { queryOne, execute } from './db'
import { getSiteName } from './site'

const STATUS_COLOR: Record<string, string> = {
  pending: '5',    // Banana (yellow)
  confirmed: '2',  // Sage (green)
  cancelled: '11', // Tomato (red)
  completed: '8',  // Blueberry (navy)
  enquiry: '3',    // Grape (purple)
}

// Add one day to a YYYY-MM-DD string (Google all-day end date is exclusive)
function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function upsertSetting(key: string, value: string) {
  await execute(
    'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
    [key, value]
  )
}

async function getGcAccessToken(): Promise<string | null> {
  const [tokenRow, expiryRow, refreshRow] = await Promise.all([
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_access_token']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_token_expiry']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_refresh_token']),
  ])
  if (!tokenRow?.value || !refreshRow?.value) return null

  const expiry = expiryRow?.value ? new Date(expiryRow.value) : new Date(0)
  const needsRefresh = Date.now() > expiry.getTime() - 5 * 60 * 1000

  if (!needsRefresh) return tokenRow.value

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GC_CLIENT_ID!,
        client_secret: process.env.GC_CLIENT_SECRET!,
        refresh_token: refreshRow.value,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()

    await Promise.all([
      upsertSetting('gc_access_token', data.access_token),
      upsertSetting('gc_token_expiry', newExpiry),
    ])
    return data.access_token
  } catch {
    return null
  }
}

export async function syncBookingToCalendar(bookingId: string): Promise<void> {
  const token = await getGcAccessToken()
  if (!token) return

  const booking = await queryOne<{
    id: string; public_id: string; status: string; hire_type: string;
    contact_name: string | null; driver_name: string | null; contact_email: string;
    contact_phone: string; start_date: string; end_date: string; total_days: number;
    total_cost: number; google_event_id: string | null; vehicle_name: string | null;
  }>(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1',
    [bookingId]
  )
  if (!booking) return

  const calIdRow = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_calendar_id'])
  const calId = encodeURIComponent(calIdRow?.value?.trim() || 'primary')

  const customerName = booking.contact_name ?? booking.driver_name ?? 'Customer'
  const hireLabel = booking.hire_type === 'dry-hire' ? 'Self-Drive' : 'Chauffeured'
  const siteName = await getSiteName()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const event = {
    summary: `${booking.vehicle_name ?? 'Vehicle'} — ${hireLabel} · ${customerName}`,
    description: [
      `Booking: ${booking.public_id}`,
      `Status: ${booking.status}`,
      `Vehicle: ${booking.vehicle_name ?? 'Vehicle'}`,
      `Hire Type: ${hireLabel}`,
      `Customer: ${customerName}`,
      `Email: ${booking.contact_email}`,
      `Phone: ${booking.contact_phone}`,
      `Duration: ${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`,
      `Total: $${(booking.total_cost / 100).toFixed(0)} AUD`,
      ``,
      `${siteUrl}/admin/bookings/${booking.id}`,
    ].join('\n'),
    start: { date: booking.start_date },
    end: { date: nextDay(booking.end_date) },
    colorId: STATUS_COLOR[booking.status] ?? '5',
    source: {
      title: `${siteName} Admin`,
      url: `${siteUrl}/admin/bookings/${booking.id}`,
    },
  }

  if (booking.google_event_id) {
    // Update existing event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${booking.google_event_id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      // If event was deleted from Google Calendar, clear the stored ID and recreate
      if (res.status === 404) {
        await execute('UPDATE Booking SET google_event_id = NULL WHERE id = ?', [bookingId])
        await syncBookingToCalendar(bookingId)
      } else {
        throw new Error(`Calendar update failed ${res.status}: ${err}`)
      }
    }
  } else {
    // Create new event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Calendar create failed ${res.status}: ${err}`)
    }
    const created = await res.json()
    await execute('UPDATE Booking SET google_event_id = ? WHERE id = ?', [created.id, bookingId])
  }
}

export async function deleteCalendarEvent(bookingId: string): Promise<void> {
  const token = await getGcAccessToken()
  if (!token) return

  const booking = await queryOne<{ google_event_id: string | null }>(
    'SELECT google_event_id FROM Booking WHERE id = ? LIMIT 1',
    [bookingId]
  )
  if (!booking?.google_event_id) return

  const calIdRow = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_calendar_id'])
  const calId = encodeURIComponent(calIdRow?.value?.trim() || 'primary')

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${booking.google_event_id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  // 404 means already deleted — that's fine
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Calendar delete failed ${res.status}: ${err}`)
  }
}
