import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { verifyVendorToken, VENDOR_COOKIE_NAME } from '@/lib/vendor-auth'

const MAINTENANCE_BYPASS_COOKIE = 'maintenance_bypass'

// Paths that are always accessible regardless of lock mode
const LOCK_EXCLUDED = ['/maintenance', '/api/maintenance-auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Site lock (development or maintenance mode) ───────────────────────────
  const devMode = process.env.DEVELOPMENT_MODE === 'true'
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true'
  const lockMode = devMode ? 'development' : maintenanceMode ? 'maintenance' : null

  if (lockMode) {
    const isExcluded = LOCK_EXCLUDED.some(p => pathname.startsWith(p))
    const hasBypass = req.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === 'true'
    if (!isExcluded && !hasBypass) {
      const url = new URL('/maintenance', req.url)
      url.searchParams.set('mode', lockMode)
      return NextResponse.redirect(url)
    }
  }

  // ── Admin auth ────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    const session = await verifyToken(token)
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  // ── Vendor auth ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/vendor') && !pathname.startsWith('/vendor/login')) {
    const token = req.cookies.get(VENDOR_COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/vendor/login', req.url))
    }
    const session = await verifyVendorToken(token)
    if (!session) {
      return NextResponse.redirect(new URL('/vendor/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|icons/).*)'],
}
