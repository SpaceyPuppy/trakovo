import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendorVehicles = await prisma.vendorVehicle.findMany({
    where: {
      vendor_id: session.vendorId,
      is_enabled: true,
      vehicle: { is_available: true },
    },
    include: {
      vehicle: {
        include: {
          media: { orderBy: { sort_order: 'asc' } },
        },
      },
    },
    orderBy: { vehicle: { name: 'asc' } },
  })

  const vehicles = vendorVehicles.map(vv => ({
    id: vv.vehicle.id,
    name: vv.vehicle.name,
    description: vv.vehicle.description,
    chauffeur_price: vv.vehicle.chauffeur_price / 100,
    passengers: vv.vehicle.passengers,
    transmission: vv.vehicle.transmission,
    fuel: vv.vehicle.fuel,
    media: vv.vehicle.media,
  }))

  return NextResponse.json({ vehicles })
}
