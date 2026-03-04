/**
 * GET /api/vehicles/available?start=YYYY-MM-DD&end=YYYY-MM-DD&exclude=vehicleId
 * Returns vehicles with no conflicting pending/confirmed bookings in the date range.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const exclude = searchParams.get('exclude') ?? ''

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 })
  }

  // Find vehicle IDs that have a conflicting booking
  const conflicting = await prisma.booking.findMany({
    where: {
      status: { in: ['pending', 'confirmed'] },
      // Overlap: booking.start <= end AND booking.end >= start
      start_date: { lte: end },
      end_date: { gte: start },
    },
    select: { vehicle_id: true },
  })
  const blockedIds = Array.from(new Set(conflicting.map((b) => b.vehicle_id)))

  const vehicles = await prisma.vehicle.findMany({
    where: {
      is_available: true,
      id: { notIn: [...blockedIds, exclude].filter((id): id is string => Boolean(id)) },
    },
    include: { media: { orderBy: { sort_order: 'asc' }, take: 1 } },
    orderBy: { created_at: 'desc' },
    take: 4,
  })

  return NextResponse.json(
    vehicles.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      price: v.price / 100,
      chauffeur_price: v.chauffeur_price / 100,
      hire_modes: v.hire_modes,
      image: v.media[0]?.url ?? null,
    }))
  )
}
