import { NextRequest, NextResponse } from 'next/server'

const MAINTENANCE_BYPASS_COOKIE = 'maintenance_bypass'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.MAINTENANCE_PASSWORD

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(MAINTENANCE_BYPASS_COOKIE, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE !== 'false',
    path: '/',
    // 7-day bypass — enough for a testing window
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
