import { NextRequest, NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const messages = await prisma.driverMessage.findMany({
    where: { driver_id: session.driverId },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { subject, message, booking_id } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })
  }

  const msg = await prisma.driverMessage.create({
    data: {
      driver_id: session.driverId,
      subject: subject.trim(),
      message: message.trim(),
      booking_id: booking_id || null,
    },
  })
  return NextResponse.json(msg, { status: 201 })
}
