import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVendorToken, setVendorSessionCookie } from '@/lib/vendor-auth'
import { verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const vendor = await prisma.vendor.findUnique({ where: { username } })
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
