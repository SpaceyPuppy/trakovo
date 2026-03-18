import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { sendBookingNotification } from '@/lib/email'
import { sendPushNotification } from '@/lib/push'
import { syncBookingToCalendar } from '@/lib/calendar'
import { diffDays } from '@/lib/utils'
import type { BookingResponse } from '@/types'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const bookings = await query(
    'SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id WHERE b.vendor_id = ? ORDER BY b.created_at DESC',
    [session.vendorId]
  )

  return NextResponse.json({ bookings })
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const {
    vehicle_id,
    service_type,
    start_date,
    end_date,
    vendor_client_id,
    client_name,
    client_email,
    client_phone,
  } = await req.json()

  // service_type: 'vehicle' | 'taxi' | 'cpv'
  const svcType: 'vehicle' | 'taxi' | 'cpv' =
    service_type === 'taxi' ? 'taxi' : service_type === 'cpv' ? 'cpv' : 'vehicle'

  if (!start_date || !end_date) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }
  if (svcType === 'vehicle' && !vehicle_id) {
    return NextResponse.json({ error: 'vehicle_id is required for specific vehicle bookings' }, { status: 400 })
  }

  // Validate specific vehicle access
  let vehicle: { id: string; name: string; chauffeur_price: number } | null = null
  if (svcType === 'vehicle') {
    const vendorVehicle = await queryOne<{ is_enabled: number; vehicle_id: string; vid: string; vname: string; chauffeur_price: number; is_available: number }>(
      'SELECT vv.is_enabled, vv.vehicle_id, v.id as vid, v.name as vname, v.chauffeur_price, v.is_available FROM VendorVehicle vv JOIN Vehicle v ON vv.vehicle_id = v.id WHERE vv.vendor_id = ? AND vv.vehicle_id = ? LIMIT 1',
      [session.vendorId, vehicle_id]
    )
    if (!vendorVehicle || !vendorVehicle.is_enabled || !vendorVehicle.is_available) {
      return NextResponse.json({ error: 'Vehicle not available for your account' }, { status: 403 })
    }
    vehicle = { id: vendorVehicle.vehicle_id, name: vendorVehicle.vname, chauffeur_price: vendorVehicle.chauffeur_price }
  }

  // Resolve contact details — prefer linked client, fall back to ad-hoc fields
  let contactName = client_name ?? ''
  let contactEmail = client_email ?? ''
  let contactPhone = client_phone ?? ''
  let resolvedClientId: string | null = null

  if (vendor_client_id) {
    const client = await queryOne<{ id: string; name: string; email: string; phone: string }>(
      'SELECT id, name, email, phone FROM VendorClient WHERE id = ? AND vendor_id = ? AND is_active = 1 LIMIT 1',
      [vendor_client_id, session.vendorId]
    )
    if (client) {
      contactName = client.name
      contactEmail = client.email || contactEmail
      contactPhone = client.phone || contactPhone
      resolvedClientId = client.id
    }
  }

  if (!contactName) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
  }

  const start = new Date(start_date)
  const end = new Date(end_date)
  const total_days = diffDays(start, end) + 1
  const daily_rate = vehicle ? vehicle.chauffeur_price : 0  // cents; 0 = TBD for taxi/cpv
  const total_cost = total_days * daily_rate

  const public_id = await generatePublicId('VHB')
  const id = newId()
  const serviceLabel = svcType === 'taxi' ? 'Taxi' : svcType === 'cpv' ? 'CPV' : vehicle!.name

  await execute(
    `INSERT INTO Booking (id, public_id, vehicle_id, hire_type, service_type, status, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, vendor_id, vendor_client_id, created_at, updated_at)
     VALUES (?, ?, ?, 'chauffeured', ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, public_id, vehicle?.id ?? null, svcType, start_date, end_date, total_days, daily_rate, total_cost, contactName, contactEmail, contactPhone, session.vendorId, resolvedClientId]
  )

  const booking = await queryOne<{ id: string; public_id: string; status: string; daily_rate: number; total_cost: number; contact_name: string | null; contact_email: string; contact_phone: string; created_at: Date }>(
    'SELECT * FROM Booking WHERE id = ? LIMIT 1', [id]
  )

  const response: BookingResponse = {
    id: booking!.id,
    public_id: booking!.public_id,
    status: booking!.status as BookingResponse['status'],
    hire_type: 'chauffeured',
    service_type: svcType,
    start_date,
    end_date,
    total_days,
    daily_rate: booking!.daily_rate / 100,
    total_cost: booking!.total_cost / 100,
    vehicle: vehicle ? { id: vehicle.id, name: vehicle.name } : undefined,
    contact_name: booking!.contact_name ?? undefined,
    contact_email: booking!.contact_email,
    contact_phone: booking!.contact_phone,
    created_at: booking!.created_at instanceof Date ? booking!.created_at.toISOString() : String(booking!.created_at),
  }

  sendBookingNotification(response, serviceLabel).catch((err) =>
    console.error('[email] Vendor booking notification failed', err)
  )
  if (vehicle) {
    syncBookingToCalendar(id).catch((err) =>
      console.error('[calendar] Vendor booking sync failed', err)
    )
  }
  sendPushNotification({
    title: `New Booking (${session.vendorName}) — ${serviceLabel}`,
    body: `${contactName} · ${start_date} → ${end_date}`,
    url: `/admin/bookings/${id}`,
  }).catch(() => {})

  return NextResponse.json({ booking: response }, { status: 201 })
}
