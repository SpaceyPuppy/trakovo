import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendor = await queryOne<{
    id: string; name: string; username: string; contact_email: string;
    contact_phone: string; is_active: number; created_at: Date;
  }>('SELECT id, name, username, contact_email, contact_phone, is_active, created_at FROM Vendor WHERE id = ? LIMIT 1', [params.id])

  if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [vendorVehicles, clients, bookings, bookingCount, clientCount] = await Promise.all([
    query<{ vehicle_id: string; is_enabled: number }>(
      'SELECT vv.vehicle_id, vv.is_enabled, v.name, v.slug, v.price, v.is_available FROM VendorVehicle vv JOIN Vehicle v ON vv.vehicle_id = v.id WHERE vv.vendor_id = ?',
      [params.id]
    ),
    query('SELECT * FROM VendorClient WHERE vendor_id = ? AND is_active = 1 ORDER BY name ASC', [params.id]),
    query(
      'SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id WHERE b.vendor_id = ? ORDER BY b.created_at DESC LIMIT 20',
      [params.id]
    ),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE vendor_id = ?', [params.id]),
    queryOne<{ count: number }>('SELECT COUNT(*) as count FROM VendorClient WHERE vendor_id = ?', [params.id]),
  ])

  // Attach first media item per vehicle
  const vehicleIds = vendorVehicles.map((vv) => (vv as { vehicle_id: string }).vehicle_id)
  let firstMedia: { vehicle_id: string; url: string }[] = []
  if (vehicleIds.length > 0) {
    firstMedia = await query<{ vehicle_id: string; url: string }>(
      'SELECT vehicle_id, url FROM VehicleMedia WHERE vehicle_id IN (?) AND sort_order = 0',
      [vehicleIds]
    )
  }

  const vehiclesWithMedia = vendorVehicles.map((vv) => ({
    ...vv,
    is_enabled: Boolean((vv as { is_enabled: number }).is_enabled),
    vehicle: {
      ...(vv as object),
      media: firstMedia.filter((m) => m.vehicle_id === (vv as { vehicle_id: string }).vehicle_id),
    },
  }))

  return NextResponse.json({
    vendor: {
      ...vendor,
      is_active: Boolean(vendor.is_active),
      vehicles: vehiclesWithMedia,
      clients,
      bookings,
      _count: { bookings: bookingCount?.count ?? 0, clients: clientCount?.count ?? 0 },
    },
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'contact_email', 'contact_phone', 'is_active']
  const setClauses: string[] = []
  const values: unknown[] = []
  for (const key of allowed) {
    if (key in body) {
      setClauses.push(`${key} = ?`)
      values.push(body[key])
    }
  }
  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(params.id)

  await execute(`UPDATE Vendor SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`, values)
  const vendor = await queryOne('SELECT id, name, username, contact_email, contact_phone, is_active, created_at FROM Vendor WHERE id = ? LIMIT 1', [params.id])
  return NextResponse.json({ vendor: { ...vendor, is_active: Boolean((vendor as { is_active: number }).is_active) } })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute('DELETE FROM Vendor WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
