import { cookies, headers } from 'next/headers'
import type { AdminSession } from '@/types'

const SECRET = process.env.ADMIN_JWT_SECRET ?? 'dev-secret'
const COOKIE = 'apex_admin_session'

// Use Web APIs only (TextEncoder, crypto.subtle, atob/btoa) so this file works
// in both the Node.js runtime (API routes) and the Edge Runtime (middleware).

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

export async function createToken(username: string): Promise<string> {
  const payload = toBase64Url(JSON.stringify({
    username,
    exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
  }))
  const sig = await hmac(payload)
  return `${payload}.${sig}`
}

export async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null
    const payload = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    const expected = await hmac(payload)
    if (sig !== expected) return null
    const session: AdminSession = JSON.parse(dec.decode(fromBase64Url(payload)))
    if (Date.now() > session.exp) return null
    return session
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  // Cookie path — web portal
  const cookieStore = cookies()
  const cookieToken = cookieStore.get(COOKIE)?.value
  if (cookieToken) return verifyToken(cookieToken)

  // Bearer token path — Android companion app
  const authHeader = headers().get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7))
  }

  return null
}

export function setSessionCookie(token: string): void {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE, '', { maxAge: 0, path: '/' })
}

export const COOKIE_NAME = COOKIE
