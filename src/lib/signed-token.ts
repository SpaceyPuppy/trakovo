/**
 * Signed-token codec shared by every portal.
 *
 * Web Crypto keeps it compatible with route handlers and Edge middleware.
 * Imported HMAC keys are cached for the worker lifetime instead of being
 * rebuilt for every request.
 */

interface ExpiringClaims {
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const keyCache = new Map<string, Promise<CryptoKey>>()

function toBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function getSigningKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret)
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    keyCache.set(secret, key)
  }
  return key
}

export async function createSignedToken<T extends object>(
  claims: T,
  secret: string,
  durationMs: number
): Promise<string> {
  const payload = toBase64Url(JSON.stringify({
    ...claims,
    exp: Date.now() + durationMs,
  }))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getSigningKey(secret),
    encoder.encode(payload)
  )
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySignedToken<T extends ExpiringClaims>(
  token: string,
  secret: string,
  isValidClaims: (value: unknown) => value is T
): Promise<T | null> {
  try {
    const separator = token.lastIndexOf('.')
    if (separator <= 0 || separator === token.length - 1) return null

    const payload = token.slice(0, separator)
    const signature = fromBase64Url(token.slice(separator + 1))
    const expectedSignature = new Uint8Array(await crypto.subtle.sign(
      'HMAC',
      await getSigningKey(secret),
      encoder.encode(payload)
    ))
    if (!constantTimeEqual(signature, expectedSignature)) return null

    const claims: unknown = JSON.parse(decoder.decode(fromBase64Url(payload)))
    if (!isValidClaims(claims) || !Number.isFinite(claims.exp) || Date.now() > claims.exp) {
      return null
    }
    return claims
  } catch {
    return null
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  // HMAC-SHA256 signatures have a public, fixed length, so rejecting a malformed
  // length early does not reveal secret-dependent information.
  if (left.length !== right.length) return false

  let mismatch = 0
  for (let index = 0; index < left.length; index++) {
    mismatch |= left[index] ^ right[index]
  }
  return mismatch === 0
}
