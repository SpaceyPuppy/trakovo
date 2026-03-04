import { NextResponse } from 'next/server'
import { clearVendorSessionCookie } from '@/lib/vendor-auth'

export async function POST() {
  clearVendorSessionCookie()
  return NextResponse.json({ ok: true })
}
