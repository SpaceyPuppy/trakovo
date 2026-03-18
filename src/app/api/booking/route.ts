import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { sendBookingNotification } from '@/lib/email'
import { sendBookingReceived } from '@/lib/email-sequences'
import { syncBookingToCalendar } from '@/lib/calendar'
import { sendPushNotification } from '@/lib/push'
import { diffDays, getDailyRate } from '@/lib/utils'
import type { BookingResponse } from '@/types'

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

    const vehicle = await queryOne<{ id: string; name: string; price: number; chauffeur_price: number; day_rates: string | null }>(
      'SELECT id, name, price, chauffeur_price, day_rates FROM Vehicle WHERE id = ? LIMIT 1',
      [product_id]
    )
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const resolvedHireType = hire_type === 'dry-hire' ? 'dry-hire' : 'chauffeured'
    const start = new Date(start_date)
    const end = new Date(end_date)
    const total_days = diffDays(start, end) + 1

    // Parse day_rates and apply tiered pricing if a tier matches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedDayRates: any[] = vehicle.day_rates ? JSON.parse(vehicle.day_rates) : []
    const vehicleForRate = {
      price: vehicle.price,
      chauffeur_price: vehicle.chauffeur_price,
      day_rates: parsedDayRates.map((r) => ({ ...r, price: r.price, chauffeur_price: r.chauffeur_price })),
    }
    const daily_rate = getDailyRate(vehicleForRate, resolvedHireType, total_days)
    const total_cost = total_days * daily_rate

    const public_id = await generatePublicId('VHB')
    const id = newId()

    if (resolvedHireType === 'dry-hire') {
      // Dry-hire requires driver name and DOB (agreement must be accepted)
      if (!driver_name || !driver_dob) {
        return NextResponse.json({ error: 'Missing driver details' }, { status: 400 })
      }
      if (!agreement_accepted) {
        return NextResponse.json({ error: 'Hire agreement must be accepted' }, { status: 400 })
      }

      await execute(
        `INSERT INTO Booking (id, public_id, vehicle_id, hire_type, status, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, driver_name, driver_dob, agreement_accepted, created_at, updated_at)
         VALUES (?, ?, ?, 'dry-hire', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [id, public_id, product_id, start_date, end_date, total_days, daily_rate, total_cost, contact_name ?? driver_name, contact_email, contact_phone, driver_name, driver_dob]
      )

      const booking = await queryOne<{ id: string; public_id: string; status: string; daily_rate: number; total_cost: number; contact_name: string | null; contact_email: string; contact_phone: string; driver_name: string | null; created_at: Date }>(
        'SELECT * FROM Booking WHERE id = ? LIMIT 1', [id]
      )

      const response: BookingResponse = {
        id: booking!.id,
        public_id: booking!.public_id,
        status: booking!.status as BookingResponse['status'],
        hire_type: 'dry-hire',
        start_date,
        end_date,
        total_days,
        daily_rate: booking!.daily_rate / 100,
        total_cost: booking!.total_cost / 100,
        vehicle: { id: vehicle.id, name: vehicle.name },
        contact_name: booking!.contact_name ?? undefined,
        contact_email: booking!.contact_email,
        contact_phone: booking!.contact_phone,
        driver_name: booking!.driver_name ?? undefined,
        created_at: booking!.created_at instanceof Date ? booking!.created_at.toISOString() : String(booking!.created_at),
      }

      sendBookingNotification(response, vehicle.name).catch(err =>
        console.error('[email] Notification failed for', public_id, err)
      )
      sendBookingReceived(response, vehicle.name).catch(err =>
        console.error('[email] Received confirmation failed for', public_id, err)
      )
      syncBookingToCalendar(id).catch(err =>
        console.error('[calendar] Sync failed for', public_id, err)
      )
      sendPushNotification({
        title: `New Booking — ${vehicle.name}`,
        body: `${driver_name} · ${start_date} → ${end_date}`,
        url: `/admin/bookings/${id}`,
      }).catch(() => {})

      return NextResponse.json({ booking: response })

    } else {
      // Chauffeured (and enquiry)
      if (!contact_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      await execute(
        `INSERT INTO Booking (id, public_id, vehicle_id, hire_type, status, is_enquiry, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, trip_details, created_at, updated_at)
         VALUES (?, ?, ?, 'chauffeured', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, public_id, product_id, is_enquiry ? 'enquiry' : 'pending', Boolean(is_enquiry) ? 1 : 0, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, trip_details ?? null]
      )

      const booking = await queryOne<{ id: string; public_id: string; status: string; daily_rate: number; total_cost: number; contact_name: string | null; contact_email: string; contact_phone: string; created_at: Date }>(
        'SELECT * FROM Booking WHERE id = ? LIMIT 1', [id]
      )

      const response: BookingResponse = {
        id: booking!.id,
        public_id: booking!.public_id,
        status: booking!.status as BookingResponse['status'],
        hire_type: 'chauffeured',
        start_date,
        end_date,
        total_days,
        daily_rate: booking!.daily_rate / 100,
        total_cost: booking!.total_cost / 100,
        vehicle: { id: vehicle.id, name: vehicle.name },
        contact_name: booking!.contact_name ?? undefined,
        contact_email: booking!.contact_email,
        contact_phone: booking!.contact_phone,
        created_at: booking!.created_at instanceof Date ? booking!.created_at.toISOString() : String(booking!.created_at),
      }

      sendBookingNotification(response, vehicle.name).catch(err =>
        console.error('[email] Notification failed for', public_id, err)
      )
      sendBookingReceived(response, vehicle.name).catch(err =>
        console.error('[email] Received confirmation failed for', public_id, err)
      )
      syncBookingToCalendar(id).catch(err =>
        console.error('[calendar] Sync failed for', public_id, err)
      )
      sendPushNotification({
        title: is_enquiry ? `New Enquiry — ${vehicle.name}` : `New Booking — ${vehicle.name}`,
        body: `${contact_name} · ${start_date} → ${end_date}`,
        url: `/admin/bookings/${id}`,
      }).catch(() => {})

      return NextResponse.json({ booking: response })
    }
  } catch (err: unknown) {
    console.error('[booking]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
