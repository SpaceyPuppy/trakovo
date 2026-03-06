import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDriverToken, setDriverSessionCookie } from '@/lib/driver-auth'
import { verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const driver = await prisma.driver.findUnique({ where: { username } })
  if (!driver || !driver.is_active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, driver.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createDriverToken(driver.id, driver.name)
  setDriverSessionCookie(token)
  return NextResponse.json({ ok: true, driverName: driver.name })
}
