import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne } from '@/lib/db'
import {
  getBookingCalendarWindow,
  getVendorBookingCalendarData,
} from '@/lib/vendor-booking-calendar'

export async function GET(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const window = getBookingCalendarWindow(req.url)
    const [vehicles, clients, settings, availability] = await Promise.all([
      query<{ id: string; name: string; passengers: number }>(
        `SELECT v.id, v.name, v.passengers
         FROM VendorVehicle vv
         JOIN Vehicle v ON vv.vehicle_id = v.id
         WHERE vv.vendor_id = ?
           AND vv.is_enabled = 1
           AND v.is_available = 1
         ORDER BY v.name ASC`,
        [session.vendorId]
      ),
      query<{ id: string; name: string; reference: string }>(
        `SELECT id, name, reference
         FROM VendorClient
         WHERE vendor_id = ? AND is_active = 1
         ORDER BY name ASC
         LIMIT 1000`,
        [session.vendorId]
      ),
      queryOne<{ taxi_enabled: number; vehicle_hire_enabled: number }>(
        'SELECT taxi_enabled, vehicle_hire_enabled FROM Vendor WHERE id = ? LIMIT 1',
        [session.vendorId]
      ),
      getVendorBookingCalendarData(session.vendorId, window),
    ])

    return NextResponse.json({
      vehicles,
      clients,
      settings: {
        taxi_enabled: Boolean(settings?.taxi_enabled),
        vehicle_hire_enabled: settings ? Boolean(settings.vehicle_hire_enabled) : true,
      },
      availability,
    })
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[vendor-multi-options]', error)
    return NextResponse.json({ error: 'Unable to load booking options' }, { status: 500 })
  }
}
