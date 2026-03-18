import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { getDailyRate } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      vehicle_id, service_type, hire_type,
      start_date, end_date,
      contact_name, contact_email, contact_phone,
      status = 'confirmed',
      daily_rate_override,
      trip_details,
      notes,
    } = body

    if (!start_date || !end_date || !contact_email || !contact_phone) {
      return NextResponse.json({ error: 'start_date, end_date, contact_email and contact_phone are required' }, { status: 400 })
    }

    const resolvedServiceType = service_type ?? 'vehicle'
    const resolvedHireType = hire_type === 'dry-hire' ? 'dry-hire' : 'chauffeured'

    const start = new Date(start_date)
    const end = new Date(end_date)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }
    const total_days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    let daily_rate = 0
    let resolved_vehicle_id: string | null = null

    if (resolvedServiceType === 'vehicle' && vehicle_id) {
      const v = await queryOne<{ id: string; price: number; chauffeur_price: number; day_rates: string | null }>(
        'SELECT id, price, chauffeur_price, day_rates FROM Vehicle WHERE id = ? LIMIT 1',
        [vehicle_id]
      )
      if (!v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
      resolved_vehicle_id = v.id
      const parsedRates = v.day_rates ? JSON.parse(v.day_rates) : []
      daily_rate = getDailyRate({ price: v.price, chauffeur_price: v.chauffeur_price, day_rates: parsedRates }, resolvedHireType, total_days)
    }

    // Allow staff to override the calculated rate
    if (typeof daily_rate_override === 'number' && daily_rate_override >= 0) {
      daily_rate = Math.round(daily_rate_override * 100)
    }

    const total_cost = daily_rate * total_days
    const id = newId()
    const public_id = await generatePublicId('VHB')

    await execute(
      `INSERT INTO Booking (id, public_id, vehicle_id, hire_type, service_type, status, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, trip_details, is_enquiry, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        id, public_id,
        resolved_vehicle_id,
        resolvedHireType,
        resolvedServiceType,
        status,
        start_date, end_date, total_days,
        daily_rate, total_cost,
        contact_name ?? null,
        contact_email,
        contact_phone,
        notes ?? trip_details ?? null,
      ]
    )

    return NextResponse.json({ ok: true, id, public_id })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
