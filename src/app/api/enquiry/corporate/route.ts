import { NextRequest, NextResponse } from 'next/server'
import { execute, generatePublicId, newId, queryOne } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { name, email, phone, organisation, event_type, guests, message } = await req.json()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 })
  }

  const id = newId()
  const public_id = await generatePublicId('CRQ')

  await execute(
    `INSERT INTO CorporateEnquiry (id, public_id, name, email, phone, organisation, event_type, guests, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
    [id, public_id, name, email, phone ?? null, organisation ?? null, event_type ?? null, guests ?? null, message]
  )

  // Email the admin
  const notifRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'notification_email' LIMIT 1")
  if (notifRow?.value?.trim()) {
    const siteNameRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'site_name' LIMIT 1")
    const siteName = siteNameRow?.value ?? 'Trakovo'
    const subject = `New Corporate Enquiry ${public_id} — ${name}`
    const html = `
      <h2 style="font-family:sans-serif;margin:0 0 16px">New Corporate Enquiry — ${public_id}</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 12px 6px 0;color:#666;width:140px">Name</td><td style="padding:6px 0"><strong>${name}</strong></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#666">Email</td><td style="padding:6px 0">${email}</td></tr>
        ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Phone</td><td style="padding:6px 0">${phone}</td></tr>` : ''}
        ${organisation ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Organisation</td><td style="padding:6px 0">${organisation}</td></tr>` : ''}
        ${event_type ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Event type</td><td style="padding:6px 0">${event_type}</td></tr>` : ''}
        ${guests ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Approx guests</td><td style="padding:6px 0">${guests}</td></tr>` : ''}
        <tr><td style="padding:12px 12px 6px 0;color:#666;vertical-align:top">Message</td><td style="padding:12px 0;white-space:pre-wrap">${message}</td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px">Sent from ${siteName}</p>
    `
    sendEmail(notifRow.value.trim(), subject, html).catch(err =>
      console.error('[email] Corporate enquiry notification failed', err)
    )
  }

  return NextResponse.json({ id, public_id }, { status: 201 })
}
