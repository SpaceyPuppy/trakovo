import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  billingErrorResponse,
  createDirectInvoice,
  getIdempotencyKey,
  hashRequestPayload,
  listInvoices,
  readBillingJsonObject,
} from '@/lib/billing'

export async function GET(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const result = await listInvoices({
      status: url.searchParams.get('status'),
      vendorId: url.searchParams.get('vendor_id'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    })
    return NextResponse.json(result)
  } catch (error) {
    return billingErrorResponse(error)
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const key = getIdempotencyKey(req)
    const body = await readBillingJsonObject(req)
    const requestHash = await hashRequestPayload(body)
    const result = await createDirectInvoice({
      actor: session.username,
      bookingId: typeof body.booking_id === 'string' ? body.booking_id : '',
      dueDate: body.due_date as string | null | undefined,
      notes: body.notes as string | null | undefined,
      idempotency: { scope: 'invoice:create-direct', key: key!, requestHash },
    })
    return NextResponse.json(result.value, {
      status: result.statusCode,
      headers: { 'Idempotency-Replayed': String(result.replayed) },
    })
  } catch (error) {
    return billingErrorResponse(error)
  }
}
