import { NextResponse } from 'next/server'

export class BillingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = 'billing_error'
  ) {
    super(message)
    this.name = 'BillingError'
  }
}

export function billingErrorResponse(error: unknown): NextResponse {
  if (error instanceof BillingError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    )
  }

  console.error('[billing]', error)
  return NextResponse.json(
    { error: 'Billing request failed', code: 'billing_internal_error' },
    { status: 500 }
  )
}

export async function readBillingJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => {
    throw new BillingError('Request body must be valid JSON', 400, 'invalid_json')
  })
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BillingError('Request body must be a JSON object', 400, 'invalid_json_body')
  }
  return body as Record<string, unknown>
}
