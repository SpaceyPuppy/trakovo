import { NextResponse } from 'next/server'
import { clearVendorSessionCookie } from '@/lib/vendor-auth'

export async function POST() {
  await clearVendorSessionCookie()
  return NextResponse.json({ ok: true })
}
