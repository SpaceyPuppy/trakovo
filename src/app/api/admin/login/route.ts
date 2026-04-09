import { NextRequest, NextResponse } from 'next/server'
import { createToken, COOKIE_NAME } from '@/lib/auth'
// token + username are included in the response body so the Android app
// can use bearer-token auth without cookies. The web portal ignores them.
import { queryOne } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

const THIRTY_DAYS_S = 60 * 60 * 24 * 30

export async function POST(req: NextRequest) {
  const { username, password, rememberMe } = await req.json()

  const durationMs = rememberMe ? THIRTY_DAYS_S * 1000 : 1000 * 60 * 60 * 8
  const maxAge = rememberMe ? THIRTY_DAYS_S : 60 * 60 * 8

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }

  // Master credentials from env vars always take priority
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = await createToken(username, durationMs)
    const res = NextResponse.json({ ok: true, token, username })
    res.cookies.set(COOKIE_NAME, token, cookieOpts)
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

  const token = await createToken(username, durationMs)
  const res = NextResponse.json({ ok: true, token, username })
  res.cookies.set(COOKIE_NAME, token, cookieOpts)
  return res
}
