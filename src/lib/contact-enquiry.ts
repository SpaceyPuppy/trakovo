import { execute, generatePublicId, newId, queryOne } from './db'
import { sendEmail } from './email'
import { getSiteName } from './site'

export function escapeEnquiryHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
}

export async function saveContactEnquiry(enquiry: { name: string; email: string; phone: string; message: string }, kind = 'Contact') {
  const id = newId()
  const publicId = await generatePublicId('CNT')
  await execute(
    'INSERT INTO ContactEnquiry (id, public_id, name, email, phone, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, publicId, enquiry.name, enquiry.email, enquiry.phone, enquiry.message, 'new']
  )

  try {
    const setting = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['notification_email'])
    if (setting?.value?.trim()) {
      const siteName = await getSiteName()
      const details = Object.entries({ Name: enquiry.name, Email: enquiry.email, Phone: enquiry.phone, Message: enquiry.message })
        .filter(([, value]) => value)
        .map(([label, value]) => `<tr><td><strong>${label}</strong></td><td style="white-space:pre-wrap">${escapeEnquiryHtml(value)}</td></tr>`).join('')
      await sendEmail(setting.value.trim(), `New ${kind} Enquiry — ${siteName}`, `<p>A new ${kind.toLowerCase()} enquiry has been submitted.</p><table cellpadding="6">${details}</table><p>Review in Admin → Enquiries → Contact Enquiries.</p>`)
    }
  } catch (error) {
    console.error('[enquiry] Saved enquiry; notification failed', error)
  }
  return publicId
}
