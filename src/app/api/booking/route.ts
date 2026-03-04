import { NextRequest, NextResponse } from 'next/server'
import { prisma, generatePublicId } from '@/lib/db'
import { sendBookingNotification } from '@/lib/email'
import { syncBookingToCalendar } from '@/lib/calendar'
import { sendPushNotification } from '@/lib/push'
import { diffDays } from '@/lib/utils'
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

    const vehicle = await prisma.vehicle.findUnique({ where: { id: product_id } })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const resolvedHireType = hire_type === 'dry-hire' ? 'dry-hire' : 'chauffeured'
    const start = new Date(start_date)
    const end = new Date(end_date)
    const total_days = diffDays(start, end) + 1
    const daily_rate = resolvedHireType === 'dry-hire' ? vehicle.price : vehicle.chauffeur_price
    const total_cost = total_days * daily_rate

    const public_id = await generatePublicId('VHB')

    if (resolvedHireType === 'dry-hire') {
      // Dry-hire requires driver name and DOB (agreement must be accepted)
      if (!driver_name || !driver_dob) {
        return NextResponse.json({ error: 'Missing driver details' }, { status: 400 })
      }
      if (!agreement_accepted) {
        return NextResponse.json({ error: 'Hire agreement must be accepted' }, { status: 400 })
      }

      const booking = await prisma.booking.create({
        data: {
          public_id,
          vehicle_id: product_id,
          hire_type: 'dry-hire',
          status: 'pending',
          start_date,
          end_date,
          total_days,
          daily_rate,
          total_cost,
          contact_name: contact_name ?? driver_name,
          contact_email,
          contact_phone,
          driver_name,
          driver_dob,
          agreement_accepted: true,
        },
        include: { vehicle: true },
      })

      const response: BookingResponse = {
        id: booking.id,
        public_id: booking.public_id,
        status: booking.status as BookingResponse['status'],
        hire_type: 'dry-hire',
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_days: booking.total_days,
        daily_rate: booking.daily_rate / 100,
        total_cost: booking.total_cost / 100,
        vehicle: { id: vehicle.id, name: vehicle.name },
        contact_name: booking.contact_name ?? undefined,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        driver_name: booking.driver_name ?? undefined,
        created_at: booking.created_at.toISOString(),
      }

      sendBookingNotification(response, vehicle.name).catch(err =>
        console.error('[email] Notification failed for', public_id, err)
      )
      syncBookingToCalendar(booking.id).catch(err =>
        console.error('[calendar] Sync failed for', public_id, err)
      )
      sendPushNotification({
        title: `New Booking — ${vehicle.name}`,
        body: `${driver_name} · ${start_date} → ${end_date}`,
        url: `/admin/bookings/${booking.id}`,
      }).catch(() => {})

      return NextResponse.json({ booking: response })

    } else {
      // Chauffeured (and enquiry)
      if (!contact_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const booking = await (prisma.booking.create as (args: unknown) => Promise<{
        id: string; public_id: string; status: string; hire_type: string;
        start_date: string; end_date: string; total_days: number;
        daily_rate: number; total_cost: number;
        contact_name: string | null; contact_email: string; contact_phone: string;
        created_at: Date;
      }>)({
        data: {
          public_id,
          vehicle_id: product_id,
          hire_type: 'chauffeured',
          status: is_enquiry ? 'enquiry' : 'pending',
          is_enquiry: Boolean(is_enquiry),
          start_date,
          end_date,
          total_days,
          daily_rate,
          total_cost,
          contact_name,
          contact_email,
          contact_phone,
          trip_details: trip_details ?? null,
        },
        include: { vehicle: true },
      })

      const response: BookingResponse = {
        id: booking.id,
        public_id: booking.public_id,
        status: booking.status as BookingResponse['status'],
        hire_type: 'chauffeured',
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_days: booking.total_days,
        daily_rate: booking.daily_rate / 100,
        total_cost: booking.total_cost / 100,
        vehicle: { id: vehicle.id, name: vehicle.name },
        contact_name: booking.contact_name ?? undefined,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        created_at: booking.created_at.toISOString(),
      }

      sendBookingNotification(response, vehicle.name).catch(err =>
        console.error('[email] Notification failed for', public_id, err)
      )
      syncBookingToCalendar(booking.id).catch(err =>
        console.error('[calendar] Sync failed for', public_id, err)
      )
      sendPushNotification({
        title: is_enquiry ? `New Enquiry — ${vehicle.name}` : `New Booking — ${vehicle.name}`,
        body: `${contact_name} · ${start_date} → ${end_date}`,
        url: `/admin/bookings/${booking.id}`,
      }).catch(() => {})

      return NextResponse.json({ booking: response })
    }
  } catch (err: unknown) {
    console.error('[booking]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
