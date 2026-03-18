/**
 * GET /api/vehicles/available?start=YYYY-MM-DD&end=YYYY-MM-DD&exclude=vehicleId
 * Returns vehicles with no conflicting pending/confirmed bookings in the date range.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const exclude = searchParams.get('exclude') ?? ''

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 })
  }

  // Check for global fleet blockouts first
  const globalBlockout = await query<{ id: string }>(
    "SELECT id FROM VehicleBlockout WHERE vehicle_id IS NULL AND start_date <= ? AND end_date >= ? LIMIT 1",
    [end, start]
  )
  if (globalBlockout.length > 0) {
    return NextResponse.json([])
  }

  // Find vehicle IDs that have a conflicting booking
  const conflicting = await query<{ vehicle_id: string | null }>(
    "SELECT vehicle_id FROM Booking WHERE status IN ('pending','confirmed') AND start_date <= ? AND end_date >= ?",
    [end, start]
  )
  const blockedIds = Array.from(new Set(conflicting.map((b) => b.vehicle_id).filter(Boolean))) as string[]
  if (exclude) blockedIds.push(exclude)

  // Add per-vehicle blockouts
  const vehicleBlockouts = await query<{ vehicle_id: string }>(
    "SELECT vehicle_id FROM VehicleBlockout WHERE vehicle_id IS NOT NULL AND start_date <= ? AND end_date >= ?",
    [end, start]
  )
  vehicleBlockouts.forEach(b => { if (!blockedIds.includes(b.vehicle_id)) blockedIds.push(b.vehicle_id) })

  let vehicles: { id: string; slug: string; name: string; price: number; chauffeur_price: number; hire_modes: string }[]
  if (blockedIds.length > 0) {
    vehicles = await query(
      'SELECT id, slug, name, price, chauffeur_price, hire_modes FROM Vehicle WHERE is_available = 1 AND id NOT IN (?) ORDER BY created_at DESC LIMIT 4',
      [blockedIds]
    )
  } else {
    vehicles = await query(
      'SELECT id, slug, name, price, chauffeur_price, hire_modes FROM Vehicle WHERE is_available = 1 ORDER BY created_at DESC LIMIT 4'
    )
  }

  const vehicleIds = vehicles.map((v) => v.id)
  let firstMedia: { vehicle_id: string; url: string }[] = []
  if (vehicleIds.length > 0) {
    firstMedia = await query<{ vehicle_id: string; url: string }>(
      'SELECT vehicle_id, url FROM VehicleMedia WHERE vehicle_id IN (?) AND sort_order = 0',
      [vehicleIds]
    )
  }

  return NextResponse.json(
    vehicles.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      price: v.price / 100,
      chauffeur_price: v.chauffeur_price / 100,
      hire_modes: v.hire_modes,
      image: firstMedia.find((m) => m.vehicle_id === v.id)?.url ?? null,
    }))
  )
}
