import { cookies } from 'next/headers'
import { createSignedToken, verifySignedToken } from './signed-token'

// Uses Web APIs only (TextEncoder, crypto.subtle, atob/btoa) — safe for both
// the Node.js runtime (API routes) and the Edge Runtime (middleware).
// Password helpers (hashPassword / verifyPassword) live in src/lib/password.ts

const SECRET = process.env.DRIVER_JWT_SECRET ?? 'driver-dev-secret'
const COOKIE = 'apex_driver_session'

export interface DriverSession {
  driverId: string
  driverName: string
  exp: number
}

export async function createDriverToken(driverId: string, driverName: string, durationMs = 1000 * 60 * 60 * 8): Promise<string> {
  return createSignedToken({ driverId, driverName }, SECRET, durationMs)
}

export async function verifyDriverToken(token: string): Promise<DriverSession | null> {
  return verifySignedToken(token, SECRET, (claims): claims is DriverSession => {
    if (!claims || typeof claims !== 'object') return false
    const session = claims as Partial<DriverSession>
    return typeof session.driverId === 'string'
      && typeof session.driverName === 'string'
      && typeof session.exp === 'number'
  })
}

export async function getDriverSession(): Promise<DriverSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyDriverToken(token)
}

export function setDriverSessionCookie(token: string, maxAge = 60 * 60 * 8): void {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax',
    maxAge,
    path: '/',
  })
}

export function clearDriverSessionCookie(): void {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' })
}

export const DRIVER_COOKIE_NAME = COOKIE
