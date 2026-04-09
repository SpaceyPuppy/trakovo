import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { queryOne } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendor = await queryOne<{ taxi_enabled: number; vehicle_hire_enabled: number }>(
    'SELECT taxi_enabled, vehicle_hire_enabled FROM Vendor WHERE id = ? LIMIT 1',
    [session.vendorId]
  )

  return NextResponse.json({
    taxi_enabled: Boolean(vendor?.taxi_enabled),
    vehicle_hire_enabled: vendor ? Boolean(vendor.vehicle_hire_enabled) : true,
  })
}
