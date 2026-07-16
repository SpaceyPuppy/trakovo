import { NextRequest, NextResponse } from 'next/server'
import { generatePublicId, newId, withTransaction } from '@/lib/db'
import {
  BookingValidationError,
  lockAndValidateBookingVehicle,
} from '@/lib/booking-availability'
import { sendBookingNotification } from '@/lib/email'
import { sendBookingReceived } from '@/lib/email-sequences'
import { syncBookingToCalendar } from '@/lib/calendar'
import { sendPushNotification } from '@/lib/push'
import { getDailyRate } from '@/lib/utils'
import type { BookingCreationResponse, BookingResponseStatus, HireType } from '@/types'

interface BookingRow {
  id: string
  public_id: string
  status: BookingResponseStatus
  daily_rate: number
  total_cost: number
  contact_name: string | null
  contact_email: string
  contact_phone: string
  driver_name: string | null
  created_at: Date
}

interface StoredDayRate {
  days_from: number
  days_to: number | null
  price: number
  chauffeur_price: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      product_id, start_date, end_date, hire_type,
      contact_name, contact_email, contact_phone,
      driver_name, driver_dob, agreement_accepted,
      is_enquiry, trip_details,
    } = body

    if (!product_id || !start_date || !end_date || !contact_email || !contact_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resolvedHireType: HireType = hire_type === 'dry-hire' ? 'dry-hire' : 'chauffeured'
    const isEnquiry = Boolean(is_enquiry)

    if (resolvedHireType === 'dry-hire' && !isEnquiry) {
      if (!driver_name || !driver_dob) {
        return NextResponse.json({ error: 'Missing driver details' }, { status: 400 })
      }
      if (!agreement_accepted) {
        return NextResponse.json({ error: 'Hire agreement must be accepted' }, { status: 400 })
      }
    } else if (!contact_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const created = await withTransaction(async (transaction) => {
      const { vehicle, dateRange } = await lockAndValidateBookingVehicle(transaction, {
        channel: 'public',
        vehicleId: product_id,
        hireType: resolvedHireType,
        startDate: start_date,
        endDate: end_date,
        isEnquiry,
      })

      const dayRates = vehicle.day_rates
        ? JSON.parse(vehicle.day_rates) as StoredDayRate[]
        : []
      const dailyRate = getDailyRate(
        { price: vehicle.price, chauffeur_price: vehicle.chauffeur_price, day_rates: dayRates },
        resolvedHireType,
        dateRange.totalDays
      )
      const totalCost = dateRange.totalDays * dailyRate
      const id = newId()
      const publicId = await generatePublicId('VHB', transaction)
      const status = isEnquiry ? 'enquiry' : 'pending'
      const resolvedContactName = contact_name ?? driver_name ?? null

      await transaction.execute(
        `INSERT INTO Booking (
           id, public_id, vehicle_id, hire_type, status, is_enquiry,
           start_date, end_date, total_days, daily_rate, total_cost,
           contact_name, contact_email, contact_phone,
           driver_name, driver_dob, agreement_accepted, trip_details,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id, publicId, vehicle.id, resolvedHireType, status, isEnquiry ? 1 : 0,
          dateRange.startDate, dateRange.endDate, dateRange.totalDays, dailyRate, totalCost,
          resolvedContactName, contact_email, contact_phone,
          resolvedHireType === 'dry-hire' ? (driver_name ?? null) : null,
          resolvedHireType === 'dry-hire' ? (driver_dob ?? null) : null,
          resolvedHireType === 'dry-hire' && !isEnquiry ? 1 : 0,
          trip_details ?? null,
        ]
      )

      const booking = await transaction.queryOne<BookingRow>(
        `SELECT id, public_id, status, daily_rate, total_cost, contact_name,
                contact_email, contact_phone, driver_name, created_at
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
        hire_type: resolvedHireType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        total_days: dateRange.totalDays,
        daily_rate: booking.daily_rate / 100,
        total_cost: booking.total_cost / 100,
        vehicle: { id: vehicle.id, name: vehicle.name },
        contact_name: booking.contact_name ?? undefined,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        driver_name: booking.driver_name ?? undefined,
        is_enquiry: isEnquiry,
        created_at: booking.created_at instanceof Date
          ? booking.created_at.toISOString()
          : String(booking.created_at),
      }

      return { id, publicId, response, vehicleName: vehicle.name }
    })

    sendBookingNotification(created.response, created.vehicleName).catch(err =>
      console.error('[email] Notification failed for', created.publicId, err)
    )
    sendBookingReceived(created.response, created.vehicleName).catch(err =>
      console.error('[email] Received confirmation failed for', created.publicId, err)
    )
    syncBookingToCalendar(created.id).catch(err =>
      console.error('[calendar] Sync failed for', created.publicId, err)
    )
    sendPushNotification({
      title: isEnquiry ? `New Enquiry — ${created.vehicleName}` : `New Booking — ${created.vehicleName}`,
      body: `${resolvedHireType === 'dry-hire' && !isEnquiry ? driver_name : contact_name} · ${start_date} → ${end_date}`,
      url: `/admin/bookings/${created.id}`,
    }).catch(() => {})

    return NextResponse.json({ booking: created.response })
  } catch (err: unknown) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[booking]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
