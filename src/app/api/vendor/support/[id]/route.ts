import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { queryOne } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const enquiry = await queryOne(
    'SELECT * FROM VendorEnquiry WHERE id = ? AND vendor_id = ? LIMIT 1',
    [params.id, session.vendorId]
  )

  if (!enquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ enquiry })
}
