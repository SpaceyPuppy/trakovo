import { cookies } from 'next/headers'

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

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? enc.encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return toBase64Url(new Uint8Array(sig))
}

export async function createDriverToken(driverId: string, driverName: string, durationMs = 1000 * 60 * 60 * 8): Promise<string> {
  const payload = toBase64Url(JSON.stringify({
    driverId,
    driverName,
    exp: Date.now() + durationMs,
  }))
  const sig = await hmac(payload)
  return `${payload}.${sig}`
}

export async function verifyDriverToken(token: string): Promise<DriverSession | null> {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null
    const payload = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    const expected = await hmac(payload)
    if (sig !== expected) return null
    const session: DriverSession = JSON.parse(dec.decode(fromBase64Url(payload)))
    if (Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
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
