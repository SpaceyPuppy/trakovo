import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const enquiries = await query(
    'SELECT * FROM VendorEnquiry WHERE vendor_id = ? ORDER BY created_at DESC',
    [session.vendorId]
  )

  return NextResponse.json({ enquiries })
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { subject, message, booking_id, client_id } = await req.json()
  if (!subject || !message) {
    return NextResponse.json({ error: 'subject and message are required' }, { status: 400 })
  }

  // Validate optional booking link belongs to this vendor
  if (booking_id) {
    const booking = await queryOne('SELECT id FROM Booking WHERE id = ? AND vendor_id = ? LIMIT 1', [booking_id, session.vendorId])
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 400 })
  }

  // Validate optional client link belongs to this vendor
  if (client_id) {
    const client = await queryOne('SELECT id FROM VendorClient WHERE id = ? AND vendor_id = ? LIMIT 1', [client_id, session.vendorId])
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 400 })
  }

  const public_id = await generatePublicId('VNE')
  const id = newId()

  await execute(
    'INSERT INTO VendorEnquiry (id, public_id, vendor_id, subject, message, booking_id, client_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [id, public_id, session.vendorId, subject, message, booking_id ?? null, client_id ?? null, 'open']
  )

  const enquiry = await queryOne('SELECT * FROM VendorEnquiry WHERE id = ? LIMIT 1', [id])

  // Notify admin (fire-and-forget)
  const notifRow = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['notification_email'])
  if (notifRow?.value) {
    sendEmail(
      notifRow.value,
      `Vendor Enquiry (${session.vendorName}): ${subject}`,
      `<p><strong>From:</strong> ${session.vendorName}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p><p><em>Reference: ${public_id}</em></p>`
    ).catch(() => {})
  }

  return NextResponse.json({ enquiry }, { status: 201 })
}
