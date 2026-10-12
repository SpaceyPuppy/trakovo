import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getSettings, upsertSettings } from '@/lib/settings'
import { resolveTaxiBookingConfig, taxiPhoneHref, TAXI_BOOKING_SETTING_KEYS } from '@/lib/taxi-booking-config'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  return NextResponse.json(await getSettings())
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Settings must be an object' }, { status: 400 })
    }

    const updates = Object.entries(body)
    if (updates.some(([key, value]) => !key || typeof value !== 'string')) {
      return NextResponse.json({ error: 'Setting keys and values must be strings' }, { status: 400 })
    }

    const patch = body as Record<string, string>
    if ('taxi_online_booking_enabled' in patch && !['0', '1'].includes(patch.taxi_online_booking_enabled)) {
      return NextResponse.json({ error: 'Taxi online booking must be enabled or disabled' }, { status: 400 })
    }
    if ('taxi_booking_phone' in patch && !taxiPhoneHref(patch.taxi_booking_phone.trim())) {
      return NextResponse.json({ error: 'Enter a valid taxi booking phone number' }, { status: 400 })
    }
    if ('taxi_online_booking_enabled' in patch || 'taxi_booking_phone' in patch) {
      const current = await getSettings(TAXI_BOOKING_SETTING_KEYS)
      const config = resolveTaxiBookingConfig({ ...current, ...patch })
      if (!config.onlineBookingEnabled && !config.phoneHref) {
        return NextResponse.json({ error: 'A taxi booking phone number is required for phone bookings' }, { status: 400 })
      }
    }
    await upsertSettings(updates as Array<[string, string]>)
    return NextResponse.json(await getSettings())
  } catch (error: unknown) {
    console.error('[admin/settings] Failed to update settings', error)
    return NextResponse.json({ error: 'Unable to update settings' }, { status: 500 })
  }
}
