import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { generatePublicId, newId, query, queryOne, withTransaction } from '@/lib/db'
import {
  BookingValidationError,
  lockAndValidateBookingVehicle,
  normaliseBookingCurrency,
  validateBookingDateRange,
} from '@/lib/booking-availability'
import { sendBookingNotification } from '@/lib/email'
import { sendBookingConfirmed } from '@/lib/email-sequences'
import { sendPushNotification } from '@/lib/push'
import { syncBookingToCalendar } from '@/lib/calendar'
import type { BookingCreationResponse, BookingResponseStatus } from '@/types'

interface BookingRow {
  id: string
  public_id: string
  status: BookingResponseStatus
  daily_rate: number
  total_cost: number
  contact_name: string | null
  contact_email: string
  contact_phone: string
  created_at: Date
}

export async function GET(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(req.url)
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100
  const offset = (page - 1) * limit

  const bookings = await query(
    `SELECT b.*, v.name as vehicle_name, vc.name as vendor_client_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
     WHERE b.vendor_id = ?
     ORDER BY b.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [session.vendorId]
  )

  return NextResponse.json({ bookings, pagination: { page, limit, has_more: bookings.length === limit } })
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
    trip_details,
  } = await req.json()

  const svcType: 'vehicle' | 'taxi' | 'cpv' =
    service_type === 'taxi' ? 'taxi' : service_type === 'cpv' ? 'cpv' : 'vehicle'

  if (!start_date || !end_date) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }
  if (svcType === 'vehicle' && !vehicle_id) {
    return NextResponse.json(
      { error: 'vehicle_id is required for specific vehicle bookings' },
      { status: 400 }
    )
  }

  try {
    const vendorRow = await queryOne<{ contact_email: string; contact_phone: string; billing_currency: string }>(
      'SELECT contact_email, contact_phone, billing_currency FROM Vendor WHERE id = ? LIMIT 1',
      [session.vendorId]
    )

    const created = await withTransaction(async (transaction) => {
      let vehicle: { id: string; name: string; chauffeur_price: number; currency: string } | null = null
      let dateRange = validateBookingDateRange(start_date, end_date)

      if (svcType === 'vehicle') {
        const validated = await lockAndValidateBookingVehicle(transaction, {
          channel: 'vendor',
          vendorId: session.vendorId,
          vehicleId: vehicle_id,
          hireType: 'chauffeured',
          startDate: start_date,
          endDate: end_date,
          isEnquiry: false,
        })
        dateRange = validated.dateRange
        vehicle = {
          id: validated.vehicle.id,
          name: validated.vehicle.name,
          chauffeur_price: validated.vehicle.chauffeur_price,
          currency: validated.vehicle.currency,
        }
      }

      let contactName = client_name ?? ''
      let contactEmail = client_email || vendorRow?.contact_email || ''
      let contactPhone = client_phone || vendorRow?.contact_phone || ''
      let resolvedClientId: string | null = null

      if (vendor_client_id) {
        const client = await transaction.queryOne<{
          id: string
          name: string
          email: string
          phone: string
        }>(
          `SELECT id, name, email, phone
           FROM VendorClient
           WHERE id = ? AND vendor_id = ? AND is_active = 1
           LIMIT 1
           FOR UPDATE`,
          [vendor_client_id, session.vendorId]
        )
        if (!client) {
          throw new BookingValidationError(
            'VENDOR_CLIENT_FORBIDDEN',
            'Client is not available for your account',
            403
          )
        }
        contactName = client.name
        contactEmail = client.email || contactEmail
        contactPhone = client.phone || contactPhone
        resolvedClientId = client.id
      }

      const dailyRate = vehicle ? vehicle.chauffeur_price : 0
      const totalCost = dateRange.totalDays * dailyRate
      const currency = vehicle?.currency ?? normaliseBookingCurrency(vendorRow?.billing_currency)
      const id = newId()
      const publicId = await generatePublicId('VHB', transaction)
      const serviceLabel = svcType === 'taxi' ? 'Taxi' : svcType === 'cpv' ? 'CPV' : vehicle!.name

      await transaction.execute(
        `INSERT INTO Booking (
           id, public_id, vehicle_id, hire_type, service_type, status,
           start_date, end_date, total_days, daily_rate, total_cost, currency,
           contact_name, contact_email, contact_phone, trip_details,
           vendor_id, vendor_client_id, created_at, updated_at
         ) VALUES (?, ?, ?, 'chauffeured', ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id, publicId, vehicle?.id ?? null, svcType,
          dateRange.startDate, dateRange.endDate, dateRange.totalDays, dailyRate, totalCost, currency,
          contactName || null, contactEmail, contactPhone, trip_details ?? null,
          session.vendorId, resolvedClientId,
        ]
      )

      const booking = await transaction.queryOne<BookingRow>(
        `SELECT id, public_id, status, daily_rate, total_cost, contact_name,
                contact_email, contact_phone, created_at
         FROM Booking
         WHERE id = ?
         LIMIT 1`,
        [id]
      )
      if (!booking) throw new Error('Booking was not found after creation')

      const response: BookingCreationResponse = {
        id: booking.id,
        public_id: booking.public_id,
        status: booking.status,
        hire_type: 'chauffeured',
        service_type: svcType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        total_days: dateRange.totalDays,
        daily_rate: booking.daily_rate / 100,
        total_cost: booking.total_cost / 100,
        vehicle: vehicle ? { id: vehicle.id, name: vehicle.name } : undefined,
        contact_name: booking.contact_name ?? undefined,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        is_enquiry: false,
        created_at: booking.created_at instanceof Date
          ? booking.created_at.toISOString()
          : String(booking.created_at),
      }

      return { id, response, vehicle, serviceLabel, contactName }
    })

    sendBookingConfirmed(created.id).catch((err) =>
      console.error('[email] Vendor booking confirmed email failed', err)
    )
    sendBookingNotification(created.response, created.serviceLabel).catch((err) =>
      console.error('[email] Vendor booking notification failed', err)
    )
    if (created.vehicle) {
      syncBookingToCalendar(created.id).catch((err) =>
        console.error('[calendar] Vendor booking sync failed', err)
      )
    }
    sendPushNotification({
      title: `New Booking (${session.vendorName}) — ${created.serviceLabel}`,
      body: `${created.contactName} · ${start_date} → ${end_date}`,
      url: `/admin/bookings/${created.id}`,
    }).catch(() => {})

    return NextResponse.json({ booking: created.response }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[vendor-booking]', err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
