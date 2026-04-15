import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { createVendorToken, setVendorSessionCookie } from '@/lib/vendor-auth'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendor = await queryOne<{ id: string; name: string; is_active: number }>(
    'SELECT id, name, is_active FROM Vendor WHERE id = ? LIMIT 1',
    [params.id]
  )
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  if (!vendor.is_active) return NextResponse.json({ error: 'Vendor is inactive' }, { status: 400 })

  const token = await createVendorToken(vendor.id, vendor.name)
  setVendorSessionCookie(token)

  return NextResponse.json({ ok: true })
}
