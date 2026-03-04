import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma, generatePublicId } from '@/lib/db'
import { sendBookingNotification } from '@/lib/email'
import { sendPushNotification } from '@/lib/push'
import { syncBookingToCalendar } from '@/lib/calendar'
import { diffDays } from '@/lib/utils'
import type { BookingResponse } from '@/types'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const bookings = await prisma.booking.findMany({
    where: { vendor_id: session.vendorId },
    orderBy: { created_at: 'desc' },
    include: {
      vehicle: { select: { name: true } },
      vendor_client: { select: { name: true } },
    },
  })

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
    const vendorVehicle = await prisma.vendorVehicle.findUnique({
      where: { vendor_id_vehicle_id: { vendor_id: session.vendorId, vehicle_id } },
      include: { vehicle: true },
    })
    if (!vendorVehicle || !vendorVehicle.is_enabled || !vendorVehicle.vehicle.is_available) {
      return NextResponse.json({ error: 'Vehicle not available for your account' }, { status: 403 })
    }
    vehicle = vendorVehicle.vehicle
  }

  // Resolve contact details — prefer linked client, fall back to ad-hoc fields
  let contactName = client_name ?? ''
  let contactEmail = client_email ?? ''
  let contactPhone = client_phone ?? ''
  let resolvedClientId: string | null = null

  if (vendor_client_id) {
    const client = await prisma.vendorClient.findFirst({
      where: { id: vendor_client_id, vendor_id: session.vendorId, is_active: true },
    })
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

  const serviceLabel = svcType === 'taxi' ? 'Taxi' : svcType === 'cpv' ? 'CPV' : vehicle!.name

  // Use 'as any' on data until prisma db push regenerates types with new fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = await (prisma.booking.create as any)({
    data: {
      public_id,
      ...(vehicle ? { vehicle_id: vehicle.id } : {}),
      hire_type: 'chauffeured',
      service_type: svcType,
      status: 'pending',
      start_date,
      end_date,
      total_days,
      daily_rate,
      total_cost,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      vendor_id: session.vendorId,
      vendor_client_id: resolvedClientId,
    },
  })

  const response: BookingResponse = {
    id: booking.id,
    public_id: booking.public_id,
    status: booking.status as BookingResponse['status'],
    hire_type: 'chauffeured',
    service_type: svcType,
    start_date: booking.start_date,
    end_date: booking.end_date,
    total_days: booking.total_days,
    daily_rate: booking.daily_rate / 100,
    total_cost: booking.total_cost / 100,
    vehicle: vehicle ? { id: vehicle.id, name: vehicle.name } : undefined,
    contact_name: booking.contact_name ?? undefined,
    contact_email: booking.contact_email,
    contact_phone: booking.contact_phone,
    created_at: booking.created_at.toISOString(),
  }

  if (vehicle) {
    sendBookingNotification(response, vehicle.name).catch((err) =>
      console.error('[email] Vendor booking notification failed', err)
    )
    syncBookingToCalendar(booking.id).catch((err) =>
      console.error('[calendar] Vendor booking sync failed', err)
    )
  }
  sendPushNotification({
    title: `New Booking (${session.vendorName}) — ${serviceLabel}`,
    body: `${contactName} · ${start_date} → ${end_date}`,
    url: `/admin/bookings/${booking.id}`,
  }).catch(() => {})

  return NextResponse.json({ booking: response }, { status: 201 })
}
