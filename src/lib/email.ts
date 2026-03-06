import nodemailer from 'nodemailer'
import { queryOne, execute } from './db'
import { getSiteName } from './site'
import type { BookingResponse } from '@/types'
import { getTemplate, renderTemplate, buildTemplateContext } from './email-templates'

// ─── Microsoft Graph API helpers ─────────────────────────────────────────────

async function upsertSetting(key: string, value: string) {
  await execute(
    'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
    [key, value]
  )
}

async function getMsAccessToken(): Promise<string | null> {
  const [tokenRow, expiryRow, refreshRow] = await Promise.all([
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_access_token']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_token_expiry']),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_refresh_token']),
  ])
  if (!tokenRow?.value || !refreshRow?.value) return null

  const expiry = expiryRow?.value ? new Date(expiryRow.value) : new Date(0)
  const needsRefresh = Date.now() > expiry.getTime() - 5 * 60 * 1000

  if (!needsRefresh) return tokenRow.value

  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${process.env.MS_TENANT_ID ?? 'common'}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.MS_CLIENT_ID!,
          client_secret: process.env.MS_CLIENT_SECRET!,
          refresh_token: refreshRow.value,
          scope: 'Mail.Send User.Read offline_access',
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()

    const ops = [
      upsertSetting('ms_access_token', data.access_token),
      upsertSetting('ms_token_expiry', newExpiry),
    ]
    if (data.refresh_token) ops.push(upsertSetting('ms_refresh_token', data.refresh_token))
    await Promise.all(ops)
    return data.access_token
  } catch {
    return null
  }
}

async function sendViaGraph(token: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph API error ${res.status}: ${err}`)
  }
}

// ─── Send helper ─────────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Try Microsoft 365 first
  const msToken = await getMsAccessToken()
  if (msToken) {
    await sendViaGraph(msToken, to, subject, html)
    return
  }

  // Fall back to SMTP
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) throw new Error('No email provider configured')

  const siteName = await getSiteName()
  const transporter = nodemailer.createTransport({
    host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === 'true', auth: { user, pass },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `"${siteName}" <${user}>`,
    to,
    subject,
    html,
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendBookingNotification(
  booking: BookingResponse,
  vehicleName: string
): Promise<void> {
  const setting = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['notification_email'])
  if (!setting?.value?.trim()) return

  const template = await getTemplate('booking_notification')
  const { vars, conditions } = await buildTemplateContext(booking, vehicleName)
  const html = renderTemplate(template, vars, conditions)
  const subject = `New Booking Request ${booking.public_id} — ${vehicleName}`

  try {
    await sendEmail(setting.value.trim(), subject, html)
  } catch (err) {
    console.error('[email] Notification not sent for', booking.public_id, err)
  }
}

export async function sendCustomerQuote(
  booking: BookingResponse,
  vehicleName: string,
  note?: string
): Promise<void> {
  const template = await getTemplate('customer_quote')
  const { vars, conditions } = await buildTemplateContext(booking, vehicleName, note)
  const html = renderTemplate(template, vars, conditions)
  const subject = `Updated Quote — ${booking.public_id} — ${vehicleName}`

  await sendEmail(booking.contact_email, subject, html)
}

export async function sendTestEmail(to: string): Promise<void> {
  const siteName = await getSiteName()
  const subject = `Test Email — ${siteName} Admin`
  const html = `<p>This is a test email from <strong>${siteName}</strong>. Email notifications are working correctly.</p>`

  await sendEmail(to, subject, html)
}
