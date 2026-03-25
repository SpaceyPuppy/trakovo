import { NextRequest, NextResponse } from 'next/server'
import { execute, newId, generatePublicId, queryOne } from '@/lib/db'
import { sendSmsNotification } from '@/lib/sms-templates'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      contact_name, contact_phone,
      pickup_address, dest_address,
      pickup_lat, pickup_lng,
      dest_lat, dest_lng,
      distance_m, duration_s, fare_cents,
    } = body

    if (!contact_name || !contact_phone || !pickup_address || !dest_address ||
        pickup_lat == null || pickup_lng == null || dest_lat == null || dest_lng == null ||
        !distance_m || !duration_s || !fare_cents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = newId()
    const public_id = await generatePublicId('VHB')
    const total_cost = (fare_cents / 100).toFixed(2)

    const trip_details = JSON.stringify({
      pickup: pickup_address,
      destination: dest_address,
      pickup_coords: { lat: pickup_lat, lng: pickup_lng },
      dest_coords: { lat: dest_lat, lng: dest_lng },
      distance_m,
      duration_s,
    })

    await execute(
      `INSERT INTO Booking (
        id, public_id, hire_type, service_type, status,
        contact_name, contact_phone,
        total_cost, trip_details,
        start_date, end_date, total_days, daily_rate
      ) VALUES (?, ?, 'chauffeured', 'taxi', 'pending', ?, ?, ?, ?, NOW(), NOW(), 1, ?)`,
      [id, public_id, contact_name, contact_phone, total_cost, trip_details, total_cost]
    )

    // SMS notifications (non-blocking — template body + enabled state read from DB)
    const smsVars = {
      contact_name,
      contact_phone,
      pickup: pickup_address,
      destination: dest_address,
      eta_mins: String(Math.round(duration_s / 60)),
      booking_ref: public_id,
    }

    sendSmsNotification('sms_taxi_customer', contact_phone, smsVars).catch(() => {})

    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_dispatch_number'])
      .then(row => {
        const dispatch = row?.value?.trim()
        if (dispatch) sendSmsNotification('sms_taxi_dispatch', dispatch, smsVars).catch(() => {})
      }).catch(() => {})

    return NextResponse.json({ ok: true, booking_id: id })
  } catch (err) {
    console.error('POST /api/booking/taxi', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
