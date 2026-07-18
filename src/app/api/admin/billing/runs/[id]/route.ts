import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { billingErrorResponse, getBillingRun } from '@/lib/billing'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    return NextResponse.json(await getBillingRun(params.id))
  } catch (error) {
    return billingErrorResponse(error)
  }
}
