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
    } = body

    if (!contact_name || !contact_phone || !pickup_address || !dest_address ||
        pickup_lat == null || pickup_lng == null || dest_lat == null || dest_lng == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = newId()
    const public_id = await generatePublicId('VHB')

    const trip_details = JSON.stringify({
      pickup: pickup_address,
      destination: dest_address,
      pickup_coords: { lat: pickup_lat, lng: pickup_lng },
      dest_coords: { lat: dest_lat, lng: dest_lng },
    })

    await execute(
      `INSERT INTO Booking (
        id, public_id, hire_type, service_type, status,
        contact_name, contact_email, contact_phone,
        total_cost, currency, trip_details,
        start_date, end_date, total_days, daily_rate
      ) VALUES (?, ?, 'chauffeured', 'taxi', 'pending', ?, '', ?, 0, 'AUD', ?, NOW(), NOW(), 1, 0)`,
      [id, public_id, contact_name, contact_phone, trip_details]
    )

    // SMS notifications (non-blocking)
    const smsVars = {
      contact_name,
      contact_phone,
      pickup: pickup_address,
      destination: dest_address,
      eta_mins: '',
      booking_ref: public_id,
    }

    sendSmsNotification('sms_taxi_customer', contact_phone, smsVars).catch(() => {})

    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_dispatch_number'])
      .then(row => {
        const dispatch = row?.value?.trim()
        if (dispatch) sendSmsNotification('sms_taxi_dispatch', dispatch, smsVars).catch(() => {})
      }).catch(() => {})

    return NextResponse.json({ ok: true, booking_id: id, public_id })
  } catch (err) {
    console.error('POST /api/booking/taxi', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
