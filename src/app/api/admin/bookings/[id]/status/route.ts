import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { BookingValidationError } from '@/lib/booking-availability'
import {
  AdminBookingMutationError,
  runBookingMutationSideEffects,
  updateAdminBookingStatus,
} from '@/lib/admin-booking-mutations'

interface Context { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AdminBookingMutationError('Invalid JSON body', 400)
    }
    const status = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).status
      : undefined
    const updated = await updateAdminBookingStatus(params.id, status)
    void runBookingMutationSideEffects(updated.sideEffects)
    return NextResponse.json(updated.booking)
  } catch (error: unknown) {
    if (error instanceof AdminBookingMutationError || error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin-booking] status update failed', error)
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
  }
}
