import { NextResponse } from 'next/server'
import { getDriverSession } from '@/lib/driver-auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getDriverSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const bookings = await prisma.booking.findMany({
    where: { driver_id: session.driverId },
    orderBy: { start_date: 'asc' },
    include: { vehicle: { select: { name: true } } },
  })
  return NextResponse.json(bookings)
}
