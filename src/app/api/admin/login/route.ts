import { NextRequest, NextResponse } from 'next/server'
import { createToken, COOKIE_NAME } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 8,
  path: '/',
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  // Master credentials from env vars always take priority
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = await createToken(username)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
    return res
  }

  // Fall back to DB admin users
  const user = await queryOne<{ password_hash: string }>('SELECT password_hash FROM AdminUser WHERE username = ? LIMIT 1', [username])
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createToken(username)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
  return res
}
