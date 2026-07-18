import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { BookingValidationError } from '@/lib/booking-availability'
import { BillingError, getIdempotencyKey, hashRequestPayload } from '@/lib/billing'
import {
  AdminBookingMutationError,
  createAdminBooking,
  runBookingMutationSideEffects,
} from '@/lib/admin-booking-mutations'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const idempotencyKey = getIdempotencyKey(req)
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AdminBookingMutationError('Invalid JSON body', 400)
    }

    const requestHash = await hashRequestPayload(body)
    const result = await createAdminBooking(body, {
      scope: 'admin-booking:create',
      key: idempotencyKey!,
      requestHash,
    })
    if (!result.replayed) void runBookingMutationSideEffects(result.value.sideEffects)
    return NextResponse.json(
      { ok: true, id: result.value.id, public_id: result.value.public_id },
      {
        status: result.statusCode,
        headers: { 'Idempotency-Replayed': String(result.replayed) },
      }
    )
  } catch (error: unknown) {
    if (
      error instanceof AdminBookingMutationError
      || error instanceof BookingValidationError
      || error instanceof BillingError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin-booking] Quick Add failed', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
