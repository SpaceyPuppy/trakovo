import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<{
    id: string; name: string; description: string; chauffeur_price: number;
    passengers: string; transmission: string; fuel: string;
  }>(
    'SELECT v.id, v.name, v.description, v.chauffeur_price, v.passengers, v.transmission, v.fuel FROM VendorVehicle vv JOIN Vehicle v ON vv.vehicle_id = v.id WHERE vv.vendor_id = ? AND vv.is_enabled = 1 AND v.is_available = 1 ORDER BY v.name ASC',
    [session.vendorId]
  )

  const vehicleIds = rows.map((v) => v.id)
  let media: { vehicle_id: string }[] = []
  if (vehicleIds.length > 0) {
    media = await query<{ vehicle_id: string }>('SELECT * FROM VehicleMedia WHERE vehicle_id IN (?) ORDER BY sort_order ASC', [vehicleIds])
  }

  const vehicles = rows.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    chauffeur_price: v.chauffeur_price / 100,
    passengers: v.passengers,
    transmission: v.transmission,
    fuel: v.fuel,
    media: media.filter((m) => m.vehicle_id === v.id),
  }))

  return NextResponse.json({ vehicles })
}
