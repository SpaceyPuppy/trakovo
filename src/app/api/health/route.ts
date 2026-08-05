import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Lightweight container/load-balancer health endpoint.
 * Database readiness is checked separately by the deployment scripts so this
 * public endpoint never exposes connection or schema details.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
