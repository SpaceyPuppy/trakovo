import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { createVendorToken, setVendorSessionCookie } from '@/lib/vendor-auth'
import { verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const vendor = await queryOne<{ id: string; name: string; password_hash: string; is_active: number }>(
    'SELECT id, name, password_hash, is_active FROM Vendor WHERE username = ? LIMIT 1',
    [username]
  )
  if (!vendor || !vendor.is_active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, vendor.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createVendorToken(vendor.id, vendor.name)
  setVendorSessionCookie(token)

  return NextResponse.json({ ok: true, vendorName: vendor.name })
}
