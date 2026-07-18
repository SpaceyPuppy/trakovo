import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { generatePublicId, newId, queryOne, withTransaction } from '@/lib/db'
import {
  BookingValidationError,
  lockAndValidateBookingVehicle,
  normaliseBookingCurrency,
  validateBookingDateRange,
} from '@/lib/booking-availability'
import { sendBulkVendorBookingSummary } from '@/lib/email'
import { sendPushNotification } from '@/lib/push'
import { syncBookingToCalendar } from '@/lib/calendar'
import type { BookingCreationResponse, BookingResponseStatus } from '@/types'

const MAX_BULK_BOOKINGS = 50

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTripDetails(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null || value === '') return {}

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new BookingValidationError(
        'INVALID_REQUEST',
        'trip_details must contain valid JSON',
        400
      )
    }
  }
  if (!isRecord(parsed)) {
    throw new BookingValidationError(
      'INVALID_REQUEST',
      'trip_details must be a JSON object',
      400
    )
  }
  return { ...parsed }
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
  }

  const { bookings, authorised_by, trip_mode } = body

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return NextResponse.json(
      { error: 'bookings array is required and must not be empty' },
      { status: 400 }
    )
  }
  if (bookings.length > MAX_BULK_BOOKINGS) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_BULK_BOOKINGS} bookings can be submitted at once` },
      { status: 400 }
    )
  }
  if (typeof authorised_by !== 'string' || !authorised_by.trim()) {
    return NextResponse.json({ error: 'authorised_by is required' }, { status: 400 })
  }
  if (trip_mode !== 'taxi' && trip_mode !== 'vehicle_hire') {
    return NextResponse.json(
      { error: 'trip_mode must be taxi or vehicle_hire' },
      { status: 400 }
    )
  }
  const authorisedBy = authorised_by.trim()

  const vendorRow = await queryOne<{ contact_email: string; contact_phone: string; billing_currency: string }>(
    'SELECT contact_email, contact_phone, billing_currency FROM Vendor WHERE id = ? LIMIT 1',
    [session.vendorId]
  )
  const vendorEmail = vendorRow?.contact_email || ''
  const vendorPhone = vendorRow?.contact_phone || ''

  const created: BookingCreationResponse[] = []
  const errors: string[] = []

  for (let i = 0; i < bookings.length; i++) {
    try {
      const item = bookings[i]
      if (!isRecord(item)) {
        throw new BookingValidationError(
          'INVALID_REQUEST',
          'booking must be an object',
          400
        )
      }
      const {
        vehicle_id,
        service_type,
        start_date,
        end_date,
        vendor_client_id,
        trip_details: rawTripDetails,
        is_enquiry: rawIsEnquiry,
      } = item

      if (service_type !== 'taxi' && service_type !== 'cpv' && service_type !== 'vehicle') {
        throw new BookingValidationError(
          'INVALID_REQUEST',
          'service_type must be taxi, cpv, or vehicle',
          400
        )
      }
      if (rawIsEnquiry !== undefined && typeof rawIsEnquiry !== 'boolean') {
        throw new BookingValidationError('INVALID_REQUEST', 'is_enquiry must be a boolean', 400)
      }
      if (vendor_client_id !== undefined && typeof vendor_client_id !== 'string') {
        throw new BookingValidationError('INVALID_REQUEST', 'vendor_client_id must be a string', 400)
      }

      const svcType = service_type
      const isEnquiry = rawIsEnquiry ?? false
      const resolvedVehicleId = typeof vehicle_id === 'string' ? vehicle_id : null

      if (!start_date || !end_date) {
        throw new BookingValidationError(
          'INVALID_DATE',
          'start_date and end_date are required',
          400
        )
      }
      if (svcType === 'vehicle' && !resolvedVehicleId) {
        throw new BookingValidationError(
          'VEHICLE_NOT_FOUND',
          'vehicle_id is required for specific vehicle bookings',
          400
        )
      }

      const tripDetailsObj = parseTripDetails(rawTripDetails)
      tripDetailsObj.authorised_by = authorisedBy
      const tripDetails = JSON.stringify(tripDetailsObj)

      const committed = await withTransaction(async (transaction) => {
        let vehicle: { id: string; name: string; chauffeur_price: number; currency: string } | null = null
        let dateRange = validateBookingDateRange(start_date, end_date)

        if (svcType === 'vehicle') {
          const validated = await lockAndValidateBookingVehicle(transaction, {
            channel: 'vendor',
            vendorId: session.vendorId,
            vehicleId: resolvedVehicleId!,
            hireType: 'chauffeured',
            startDate: start_date,
            endDate: end_date,
            isEnquiry,
          })
          dateRange = validated.dateRange
          vehicle = {
            id: validated.vehicle.id,
            name: validated.vehicle.name,
            chauffeur_price: validated.vehicle.chauffeur_price,
            currency: validated.vehicle.currency,
          }
        }

        let contactName = ''
        let contactEmail = vendorEmail
        let contactPhone = vendorPhone
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
        await transaction.execute(
          `INSERT INTO Booking (
             id, public_id, vehicle_id, hire_type, service_type, status,
             start_date, end_date, total_days, daily_rate, total_cost, currency,
             contact_name, contact_email, contact_phone, trip_details, is_enquiry,
             vendor_id, vendor_client_id, created_at, updated_at
           ) VALUES (?, ?, ?, 'chauffeured', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            id, publicId, vehicle?.id ?? null, svcType, isEnquiry ? 'enquiry' : 'confirmed',
            dateRange.startDate, dateRange.endDate, dateRange.totalDays, dailyRate, totalCost, currency,
            contactName || null, contactEmail, contactPhone, tripDetails, isEnquiry ? 1 : 0,
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
          is_enquiry: isEnquiry,
          created_at: booking.created_at instanceof Date
            ? booking.created_at.toISOString()
            : String(booking.created_at),
        }

        return { id, publicId, response, vehicle }
      })

      created.push(committed.response)
      if (committed.vehicle) {
        syncBookingToCalendar(committed.id).catch((err) =>
          console.error('[calendar] Bulk booking sync failed for', committed.publicId, err)
        )
      }
    } catch (err) {
      if (!(err instanceof BookingValidationError)) {
        console.error(`[vendor-booking-bulk] Booking ${i + 1} failed`, err)
      }
      const message = err instanceof BookingValidationError
        ? err.message
        : 'Failed to create booking'
      errors.push(`Booking ${i + 1} failed: ${message}`)
    }
  }

  if (created.length > 0) {
    sendBulkVendorBookingSummary(
      created,
      session.vendorName,
      authorisedBy,
      trip_mode,
      vendorEmail || undefined
    ).catch((err) =>
      console.error('[email] Bulk booking summary email failed', err)
    )

    sendPushNotification({
      title: `New Batch (${session.vendorName}) — ${created.length} booking(s)`,
      body: `Authorised by ${authorisedBy}`,
      url: '/admin/bookings',
    }).catch(() => {})
  }

  if (errors.length > 0 && created.length === 0) {
    return NextResponse.json(
      { created: [], errors, error: errors[0] },
      { status: 400 }
    )
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { created, errors, message: `${created.length} of ${bookings.length} bookings created` },
      { status: 201 }
    )
  }

  return NextResponse.json({ created }, { status: 201 })
}
