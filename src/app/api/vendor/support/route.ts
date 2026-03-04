import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma, generatePublicId } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const enquiries = await prisma.vendorEnquiry.findMany({
    where: { vendor_id: session.vendorId },
    orderBy: { created_at: 'desc' },
  })

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
    const booking = await prisma.booking.findFirst({
      where: { id: booking_id, vendor_id: session.vendorId },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 400 })
  }

  // Validate optional client link belongs to this vendor
  if (client_id) {
    const client = await prisma.vendorClient.findFirst({
      where: { id: client_id, vendor_id: session.vendorId },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 400 })
  }

  const public_id = await generatePublicId('VNE')

  const enquiry = await prisma.vendorEnquiry.create({
    data: {
      public_id,
      vendor_id: session.vendorId,
      subject,
      message,
      booking_id: booking_id ?? null,
      client_id: client_id ?? null,
    },
  })

  // Notify admin (fire-and-forget)
  const notifRow = await prisma.setting.findUnique({ where: { key: 'notification_email' } })
  if (notifRow?.value) {
    sendEmail(
      notifRow.value,
      `Vendor Enquiry (${session.vendorName}): ${subject}`,
      `<p><strong>From:</strong> ${session.vendorName}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p><p><em>Reference: ${public_id}</em></p>`
    ).catch(() => {})
  }

  return NextResponse.json({ enquiry }, { status: 201 })
}
