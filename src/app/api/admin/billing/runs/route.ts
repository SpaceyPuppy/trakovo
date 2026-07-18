import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  billingErrorResponse,
  createBillingRun,
  getIdempotencyKey,
  hashRequestPayload,
  readBillingJsonObject,
} from '@/lib/billing'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const key = getIdempotencyKey(req)
    const body = await readBillingJsonObject(req)
    const requestHash = await hashRequestPayload(body)
    const result = await createBillingRun({
      actor: session.username,
      cutoffDate: body.cutoff_date,
      vendorIds: body.vendor_ids,
      reviewedBookings: body.reviewed_bookings,
      dueDate: body.due_date,
      notes: body.notes,
      idempotency: { scope: 'billing-run:create', key: key!, requestHash },
    })
    return NextResponse.json(result.value, {
      status: result.statusCode,
      headers: { 'Idempotency-Replayed': String(result.replayed) },
    })
  } catch (error) {
    return billingErrorResponse(error)
  }
}
