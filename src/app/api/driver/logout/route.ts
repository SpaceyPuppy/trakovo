import { NextResponse } from 'next/server'
import { clearDriverSessionCookie } from '@/lib/driver-auth'

export async function POST() {
  clearDriverSessionCookie()
  return NextResponse.json({ ok: true })
}
