import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { queryOne } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const booking = await queryOne(
    'SELECT b.*, v.name as vehicle_name, vc.id as vc_id, vc.name as vc_name, vc.email as vc_email, vc.phone as vc_phone FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id WHERE b.id = ? AND b.vendor_id = ? LIMIT 1',
    [params.id, session.vendorId]
  )

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ booking })
}
