import { NextRequest, NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Confirm this booking belongs to this driver
  const booking = await prisma.booking.findFirst({
    where: { id: params.id, driver_id: session.driverId },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Note text required' }, { status: 400 })

  const note = await prisma.bookingNote.create({
    data: { booking_id: params.id, text: text.trim(), author: session.driverName },
  })
  return NextResponse.json(note, { status: 201 })
}
