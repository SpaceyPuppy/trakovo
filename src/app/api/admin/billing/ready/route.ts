import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { billingErrorResponse, getBillingReadiness } from '@/lib/billing'

export async function GET(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const vendorIds = url.searchParams.getAll('vendor_id')
    return NextResponse.json(await getBillingReadiness({
      cutoff: url.searchParams.get('cutoff'),
      vendorIds: vendorIds.length ? vendorIds : undefined,
    }))
  } catch (error) {
    return billingErrorResponse(error)
  }
}
