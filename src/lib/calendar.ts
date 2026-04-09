import { queryOne, execute } from './db'
import { getSiteName } from './site'

// MS Graph category colours
const MS_STATUS_CATEGORY: Record<string, string> = {
  pending: 'Yellow',
  confirmed: 'Green',
  cancelled: 'Red',
  completed: 'Blue',
  enquiry: 'Purple',
}

// Add one day to a YYYY-MM-DD string (end date is exclusive for all-day events)
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

// ─── Microsoft Graph Calendar ─────────────────────────────────────────────────

export async function getMsAccessToken(): Promise<string | null> {
  const [tokenRow, expiryRow, refreshRow] = await Promise.all([
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_access_token']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_token_expiry']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_refresh_token']),
  ])
  if (!tokenRow?.value || !refreshRow?.value) return null

  const expiry = expiryRow?.value ? new Date(expiryRow.value) : new Date(0)
  const needsRefresh = Date.now() > expiry.getTime() - 5 * 60 * 1000

  if (!needsRefresh) return tokenRow.value

  const tenantId = process.env.MS_TENANT_ID
  if (!tenantId) return null

  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.MS_CLIENT_ID!,
          client_secret: process.env.MS_CLIENT_SECRET!,
          refresh_token: refreshRow.value,
          scope: 'Mail.Send User.Read Calendars.ReadWrite offline_access',
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()

    await Promise.all([
      upsertSetting('ms_access_token', data.access_token),
      upsertSetting('ms_token_expiry', newExpiry),
      // Refresh token may rotate — update if a new one is provided
      ...(data.refresh_token ? [upsertSetting('ms_refresh_token', data.refresh_token)] : []),
    ])
    return data.access_token
  } catch {
    return null
  }
}

// ─── Sync booking to Microsoft 365 Calendar ───────────────────────────────────

export async function syncBookingToCalendar(bookingId: string): Promise<void> {
  const booking = await queryOne<{
    id: string; public_id: string; status: string; hire_type: string;
    contact_name: string | null; driver_name: string | null; contact_email: string;
    contact_phone: string; start_date: string; end_date: string; total_days: number;
    total_cost: number; ms_event_id: string | null;
    vehicle_name: string | null;
  }>(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1',
    [bookingId]
  )
  if (!booking) return

  const customerName = booking.contact_name ?? booking.driver_name ?? 'Customer'
  const hireLabel = booking.hire_type === 'dry-hire' ? 'Self-Drive' : 'Chauffeured'
  const siteName = await getSiteName()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const vehicleName = booking.vehicle_name ?? 'Vehicle'

  const summary = `${vehicleName} — ${hireLabel} · ${customerName}`
  const description = [
    `Booking: ${booking.public_id}`,
    `Status: ${booking.status}`,
    `Vehicle: ${vehicleName}`,
    `Hire Type: ${hireLabel}`,
    `Customer: ${customerName}`,
    `Email: ${booking.contact_email}`,
    `Phone: ${booking.contact_phone}`,
    `Duration: ${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`,
    `Total: $${(booking.total_cost / 100).toFixed(0)} AUD`,
    ``,
    `${siteUrl}/admin/bookings/${booking.id}`,
  ].join('\n')

  const [msToken, calendarRow] = await Promise.all([
    getMsAccessToken(),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_calendar_id']),
  ])
  if (!msToken) return

  const calendarId = calendarRow?.value?.trim() || null
  // Create URL: use selected calendar if set, otherwise default calendar
  const createUrl = calendarId
    ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`
    : 'https://graph.microsoft.com/v1.0/me/events'

  try {
    const msEvent = {
      subject: summary,
      isAllDay: true,
      start: { dateTime: `${booking.start_date}T00:00:00`, timeZone: 'UTC' },
      end: { dateTime: `${nextDay(booking.end_date)}T00:00:00`, timeZone: 'UTC' },
      body: { contentType: 'text', content: description },
      categories: [MS_STATUS_CATEGORY[booking.status] ?? 'Yellow'],
    }

    if (booking.ms_event_id) {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${booking.ms_event_id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${msToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(msEvent),
        }
      )
      if (!res.ok) {
        if (res.status === 404) {
          await execute('UPDATE Booking SET ms_event_id = NULL WHERE id = ?', [bookingId])
          // Re-fetch updated booking and create new event
          const fresh = await queryOne<{ ms_event_id: string | null }>(
            'SELECT ms_event_id FROM Booking WHERE id = ? LIMIT 1', [bookingId]
          )
          if (fresh && !fresh.ms_event_id) {
            const createRes = await fetch(createUrl, {
              method: 'POST',
              headers: { Authorization: `Bearer ${msToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(msEvent),
            })
            if (createRes.ok) {
              const created = await createRes.json()
              await execute('UPDATE Booking SET ms_event_id = ? WHERE id = ?', [created.id, bookingId])
            }
          }
        } else {
          const err = await res.text()
          throw new Error(`MS Calendar update failed ${res.status}: ${err}`)
        }
      }
    } else {
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${msToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(msEvent),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`MS Calendar create failed ${res.status}: ${err}`)
      }
      const created = await res.json()
      await execute('UPDATE Booking SET ms_event_id = ? WHERE id = ?', [created.id, bookingId])
    }
  } catch (err) {
    console.error('[calendar] MS 365 Calendar sync failed:', err)
  }
}

export async function deleteCalendarEvent(bookingId: string): Promise<void> {
  const booking = await queryOne<{ ms_event_id: string | null }>(
    'SELECT ms_event_id FROM Booking WHERE id = ? LIMIT 1',
    [bookingId]
  )
  if (!booking?.ms_event_id) return

  const msToken = await getMsAccessToken()
  if (!msToken) return

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${booking.ms_event_id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${msToken}` } }
    )
    if (!res.ok && res.status !== 404) {
      const err = await res.text()
      throw new Error(`MS Calendar delete failed ${res.status}: ${err}`)
    }
  } catch (err) {
    console.error('[calendar] MS 365 Calendar delete failed:', err)
  }
}
