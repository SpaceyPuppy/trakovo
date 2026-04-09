import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { createDriverToken, setDriverSessionCookie } from '@/lib/driver-auth'
import { verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  const { username, password, rememberMe } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const driver = await queryOne<{ id: string; name: string; password_hash: string; is_active: number }>(
    'SELECT id, name, password_hash, is_active FROM Driver WHERE username = ? LIMIT 1',
    [username]
  )
  if (!driver || !driver.is_active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, driver.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const durationMs = rememberMe ? 1000 * 60 * 60 * 24 * 30 : undefined
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined
  const token = await createDriverToken(driver.id, driver.name, durationMs)
  setDriverSessionCookie(token, maxAge)
  return NextResponse.json({ ok: true, driverName: driver.name })
}
