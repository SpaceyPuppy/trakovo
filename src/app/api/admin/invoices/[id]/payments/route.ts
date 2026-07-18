import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  billingErrorResponse,
  getIdempotencyKey,
  hashRequestPayload,
  recordInvoicePayment,
  readBillingJsonObject,
} from '@/lib/billing'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const key = getIdempotencyKey(req)
    const body = await readBillingJsonObject(req)
    const requestHash = await hashRequestPayload(body)
    const result = await recordInvoicePayment({
      actor: session.username,
      invoiceId: params.id,
      amountCents: body.amount_cents,
      paymentDate: body.payment_date as string | null | undefined,
      method: body.method,
      reference: body.reference,
      notes: body.notes,
      idempotency: { scope: `invoice:${params.id}:payment`, key: key!, requestHash },
    })
    return NextResponse.json(result.value, {
      status: result.statusCode,
      headers: { 'Idempotency-Replayed': String(result.replayed) },
    })
  } catch (error) {
    return billingErrorResponse(error)
  }
}
