import { cookies } from 'next/headers'
import { createSignedToken, verifySignedToken } from './signed-token'

// Uses Web APIs only (TextEncoder, crypto.subtle, atob/btoa) — safe for both
// the Node.js runtime (API routes) and the Edge Runtime (middleware).
// Password helpers (hashPassword / verifyPassword) live in src/lib/password.ts

const SECRET = process.env.VENDOR_JWT_SECRET ?? 'vendor-dev-secret'
const COOKIE = 'apex_vendor_session'

export interface VendorSession {
  vendorId: string
  vendorName: string
  exp: number
}

export async function createVendorToken(vendorId: string, vendorName: string, durationMs = 1000 * 60 * 60 * 8): Promise<string> {
  return createSignedToken({ vendorId, vendorName }, SECRET, durationMs)
}

export async function verifyVendorToken(token: string): Promise<VendorSession | null> {
  return verifySignedToken(token, SECRET, (claims): claims is VendorSession => {
    if (!claims || typeof claims !== 'object') return false
    const session = claims as Partial<VendorSession>
    return typeof session.vendorId === 'string'
      && typeof session.vendorName === 'string'
      && typeof session.exp === 'number'
  })
}

export async function getVendorSession(): Promise<VendorSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyVendorToken(token)
}

export function setVendorSessionCookie(token: string, maxAge = 60 * 60 * 8): void {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
}

export function clearVendorSessionCookie(): void {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' })
}

export const VENDOR_COOKIE_NAME = COOKIE
