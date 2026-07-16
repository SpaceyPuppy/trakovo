import { NextResponse } from 'next/server'
import { execute, newId, generatePublicId, queryOne } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { getSiteName } from '@/lib/site'

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, phone, message } = body

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 })
  }

  const id = newId()
  const public_id = await generatePublicId('CNT')

  await execute(
    'INSERT INTO ContactEnquiry (id, public_id, name, email, phone, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, public_id, name.trim(), email.trim(), (phone ?? '').trim(), message.trim(), 'new']
  )

  // Email notification
  try {
    const setting = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['notification_email'])
    if (setting?.value?.trim()) {
      const siteName = await getSiteName()
      const subject = `New Contact Enquiry — ${siteName}`
      const html = `
        <p>A new contact enquiry has been submitted.</p>
        <table cellpadding="6">
          <tr><td><strong>Name</strong></td><td>${name.trim()}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email.trim()}</td></tr>
          ${phone?.trim() ? `<tr><td><strong>Phone</strong></td><td>${phone.trim()}</td></tr>` : ''}
          <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap">${message.trim()}</td></tr>
        </table>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/enquiries/contact">View in admin portal →</a></p>
      `
      await sendEmail(setting.value.trim(), subject, html)
    }
  } catch {
    // Non-fatal — enquiry is saved regardless
  }

  return NextResponse.json({ ok: true, public_id })
}
