import { cookies, headers } from 'next/headers'
import type { AdminSession } from '@/types'
import { createSignedToken, verifySignedToken } from './signed-token'

const SECRET = process.env.ADMIN_JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-secret')
const COOKIE = 'apex_admin_session'

// Use Web APIs only (TextEncoder, crypto.subtle, atob/btoa) so this file works
// in both the Node.js runtime (API routes) and the Edge Runtime (middleware).

export async function createToken(username: string, durationMs = 1000 * 60 * 60 * 8): Promise<string> {
  return createSignedToken({ username }, SECRET, durationMs)
}

export async function verifyToken(token: string): Promise<AdminSession | null> {
  return verifySignedToken(token, SECRET, (claims): claims is AdminSession => {
    if (!claims || typeof claims !== 'object') return false
    const session = claims as Partial<AdminSession>
    return typeof session.username === 'string' && typeof session.exp === 'number'
  })
}

export async function getAdminSession(): Promise<AdminSession | null> {
  // Cookie path — web portal
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(COOKIE)?.value
  if (cookieToken) return verifyToken(cookieToken)

  // Bearer token path — Android companion app
  const authHeader = (await headers()).get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7))
  }

  return null
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(COOKIE, '', { maxAge: 0, path: '/' })
}

export const COOKIE_NAME = COOKIE
