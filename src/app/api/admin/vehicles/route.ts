import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { readJsonObject, withAdminApi } from '@/lib/api-route'
import { createVehicle, parseVehicleInput } from '@/lib/vehicle-admin'

type VehicleRow = Record<string, unknown> & { id: string; is_available: number }
type MediaRow = Record<string, unknown> & { vehicle_id: string }

export const GET = withAdminApi(async () => {
  const vehicles = await query<VehicleRow>('SELECT * FROM Vehicle ORDER BY created_at DESC')
  if (vehicles.length === 0) return NextResponse.json([])

  const media = await query<MediaRow>(
    'SELECT * FROM VehicleMedia WHERE vehicle_id IN (?) ORDER BY sort_order ASC',
    [vehicles.map(({ id }) => id)]
  )
  const mediaByVehicle = new Map<string, MediaRow[]>()
  for (const item of media) {
    const items = mediaByVehicle.get(item.vehicle_id) ?? []
    items.push(item)
    mediaByVehicle.set(item.vehicle_id, items)
  }

  return NextResponse.json(vehicles.map((vehicle) => ({
    ...vehicle,
    is_available: Boolean(vehicle.is_available),
    media: mediaByVehicle.get(vehicle.id) ?? [],
  })))
})

export const POST = withAdminApi(async (request) => {
  const body = await readJsonObject(request)
  const vehicle = await createVehicle(parseVehicleInput(body, true))
  return NextResponse.json(vehicle, { status: 201 })
})
