import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { sendBulkVendorBookingSummary } from '@/lib/email'
import { sendPushNotification } from '@/lib/push'
import { syncBookingToCalendar } from '@/lib/calendar'
import { diffDays } from '@/lib/utils'
import type { BookingResponse } from '@/types'

interface BulkBookingRequest {
  bookings: Array<{
    service_type: 'taxi' | 'cpv' | 'vehicle'
    start_date: string
    end_date: string
    vehicle_id?: string
    vendor_client_id?: string
    trip_details?: string
    is_enquiry?: boolean
  }>
  authorised_by: string
  trip_mode: 'taxi' | 'vehicle_hire'
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body: BulkBookingRequest = await req.json()
  const { bookings, authorised_by, trip_mode } = body

  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return NextResponse.json({ error: 'bookings array is required and must not be empty' }, { status: 400 })
  }
  if (!authorised_by?.trim()) {
    return NextResponse.json({ error: 'authorised_by is required' }, { status: 400 })
  }

  // Fetch vendor's own contact details as fallback for bookings without a client
  const vendorRow = await queryOne<{ contact_email: string; contact_phone: string }>(
    'SELECT contact_email, contact_phone FROM Vendor WHERE id = ? LIMIT 1',
    [session.vendorId]
  )
  const vendorEmail = vendorRow?.contact_email || ''
  const vendorPhone = vendorRow?.contact_phone || ''

  const created: BookingResponse[] = []
  const errors: string[] = []

  for (let i = 0; i < bookings.length; i++) {
    try {
      const {
        vehicle_id,
        service_type,
        start_date,
        end_date,
        vendor_client_id,
        trip_details: rawTripDetails,
        is_enquiry: isEnquiry = false,
      } = bookings[i]

      const svcType: 'vehicle' | 'taxi' | 'cpv' =
        service_type === 'taxi' ? 'taxi' : service_type === 'cpv' ? 'cpv' : 'vehicle'

      if (!start_date || !end_date) {
        throw new Error('start_date and end_date are required')
      }
      if (svcType === 'vehicle' && !vehicle_id) {
        throw new Error('vehicle_id is required for specific vehicle bookings')
      }

      // Validate specific vehicle access
      let vehicle: { id: string; name: string; chauffeur_price: number } | null = null
      if (svcType === 'vehicle') {
        const vendorVehicle = await queryOne<{
          is_enabled: number
          vehicle_id: string
          vid: string
          vname: string
          chauffeur_price: number
          is_available: number
        }>(
          'SELECT vv.is_enabled, vv.vehicle_id, v.id as vid, v.name as vname, v.chauffeur_price, v.is_available FROM VendorVehicle vv JOIN Vehicle v ON vv.vehicle_id = v.id WHERE vv.vendor_id = ? AND vv.vehicle_id = ? LIMIT 1',
          [session.vendorId, vehicle_id]
        )
        if (!vendorVehicle || !vendorVehicle.is_enabled || !vendorVehicle.is_available) {
          throw new Error('Vehicle not available for your account')
        }
        vehicle = { id: vendorVehicle.vehicle_id, name: vendorVehicle.vname, chauffeur_price: vendorVehicle.chauffeur_price }

        // Check for conflicting bookings (skip for enquiries)
        if (!isEnquiry) {
          const conflict = await queryOne<{ id: string }>(
            `SELECT id FROM Booking WHERE vehicle_id = ? AND status NOT IN ('cancelled', 'enquiry') AND start_date <= ? AND end_date >= ? LIMIT 1`,
            [vehicle.id, end_date, start_date]
          )
          if (conflict) {
            throw new Error(`Vehicle is already booked for ${start_date} to ${end_date}`)
          }
        }
      }

      // Parse trip_details and add authorised_by
      let tripDetailsObj: Record<string, unknown> = {}
      if (rawTripDetails) {
        try {
          tripDetailsObj = JSON.parse(rawTripDetails)
        } catch {
          // If invalid JSON, just start fresh
          tripDetailsObj = {}
        }
      }
      tripDetailsObj.authorised_by = authorised_by

      const trip_details = JSON.stringify(tripDetailsObj)

      const start = new Date(start_date)
      const end = new Date(end_date)
      const total_days = diffDays(start, end) + 1
      const daily_rate = vehicle ? vehicle.chauffeur_price : 0
      const total_cost = total_days * daily_rate

      const public_id = await generatePublicId('VHB')
      const id = newId()
      const serviceLabel = svcType === 'taxi' ? 'Taxi' : svcType === 'cpv' ? 'CPV' : vehicle!.name

      await execute(
        `INSERT INTO Booking (id, public_id, vehicle_id, hire_type, service_type, status, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, trip_details, is_enquiry, vendor_id, vendor_client_id, created_at, updated_at)
         VALUES (?, ?, ?, 'chauffeured', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, public_id, vehicle?.id ?? null, svcType, isEnquiry ? 'enquiry' : 'confirmed', start_date, end_date, total_days, daily_rate, total_cost, null, vendorEmail || null, vendorPhone || null, trip_details, isEnquiry ? 1 : 0, session.vendorId, vendor_client_id ?? null]
      )

      const booking = await queryOne<{
        id: string
        public_id: string
        status: string
        daily_rate: number
        total_cost: number
        contact_name: string | null
        contact_email: string
        contact_phone: string
        created_at: Date
      }>('SELECT * FROM Booking WHERE id = ? LIMIT 1', [id])

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

      created.push(response)

      if (vehicle) {
        syncBookingToCalendar(id).catch((err) =>
          console.error('[calendar] Bulk booking sync failed for', public_id, err)
        )
      }
    } catch (err) {
      errors.push(
        `Booking ${i + 1} failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  // Send single summary email for all created bookings
  if (created.length > 0) {
    sendBulkVendorBookingSummary(created, session.vendorName, authorised_by, trip_mode, vendorEmail || undefined).catch((err) =>
      console.error('[email] Bulk booking summary email failed', err)
    )

    sendPushNotification({
      title: `New Batch (${session.vendorName}) — ${created.length} booking(s)`,
      body: `Authorised by ${authorised_by}`,
      url: '/admin/bookings',
    }).catch(() => {})
  }

  if (errors.length > 0 && created.length === 0) {
    // All bookings failed — return 400 so client sees the error
    return NextResponse.json(
      { created: [], errors, error: errors[0] },
      { status: 400 }
    )
  }

  if (errors.length > 0) {
    // Partial success
    return NextResponse.json(
      { created, errors, message: `${created.length} of ${bookings.length} bookings created` },
      { status: 201 }
    )
  }

  return NextResponse.json({ created }, { status: 201 })
}
