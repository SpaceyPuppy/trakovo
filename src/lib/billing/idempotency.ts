import type { DbTransaction } from '@/lib/db'
import { newId } from '@/lib/db'
import { BillingError } from './errors'

interface StoredRequest {
  request_hash: string
  status_code: number | null
  response_body: string | null
  resource_id: string | null
  expired: number
}

export interface IdempotencyInput {
  scope: string
  key: string
  requestHash: string
}

export interface IdempotentResult<T> {
  value: T
  statusCode: number
  replayed: boolean
}

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalise(child)])
    )
  }
  return value
}

export async function hashRequestPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalise(payload)))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function getIdempotencyKey(request: Request, required = true): string | null {
  const key = request.headers.get('Idempotency-Key')?.trim() ?? ''
  if (!key) {
    if (required) {
      throw new BillingError(
        'Idempotency-Key header is required',
        400,
        'idempotency_key_required'
      )
    }
    return null
  }
  if (key.length > 128) {
    throw new BillingError(
      'Idempotency-Key must be 128 characters or fewer',
      400,
      'invalid_idempotency_key'
    )
  }
  return key
}

/**
 * Stores the response in the same transaction as the ledger mutation. A retry
 * therefore observes either the completed response or no mutation at all.
 */
export async function runIdempotently<T>(
  transaction: DbTransaction,
  input: IdempotencyInput,
  work: () => Promise<{ value: T; statusCode: number; resourceId?: string }>
): Promise<IdempotentResult<T>> {
  if (!input.scope || input.scope.length > 63) {
    throw new BillingError('Idempotency scope is invalid', 500, 'invalid_idempotency_scope')
  }
  if (!input.key || input.key.length > 128 || !/^[a-f0-9]{64}$/i.test(input.requestHash)) {
    throw new BillingError('Idempotency metadata is invalid', 400, 'invalid_idempotency_metadata')
  }
  let stored = await transaction.queryOne<StoredRequest>(
    `SELECT request_hash, status_code, response_body, resource_id,
            expires_at <= NOW() AS expired
     FROM RequestIdempotency
     WHERE scope = ? AND \`key\` = ?
     FOR UPDATE`,
    [input.scope, input.key]
  )

  if (Number(stored?.expired) === 1) {
    await transaction.execute(
      'DELETE FROM RequestIdempotency WHERE scope = ? AND `key` = ?',
      [input.scope, input.key]
    )
    stored = null
  }

  if (stored) {
    if (stored.request_hash !== input.requestHash) {
      throw new BillingError(
        'This Idempotency-Key was already used with a different request',
        409,
        'idempotency_conflict'
      )
    }
    if (stored.status_code === null || stored.response_body === null) {
      throw new BillingError(
        'A request with this Idempotency-Key is already in progress',
        409,
        'idempotency_in_progress'
      )
    }
    return {
      value: JSON.parse(stored.response_body) as T,
      statusCode: stored.status_code,
      replayed: true,
    }
  }

  await transaction.execute(
    `INSERT INTO RequestIdempotency
       (id, scope, \`key\`, request_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [newId(), input.scope, input.key, input.requestHash]
  )

  const result = await work()
  await transaction.execute(
    `UPDATE RequestIdempotency
     SET status_code = ?, response_body = ?, resource_id = ?
     WHERE scope = ? AND \`key\` = ?`,
    [
      result.statusCode,
      JSON.stringify(result.value),
      result.resourceId ?? null,
      input.scope,
      input.key,
    ]
  )

  return { value: result.value, statusCode: result.statusCode, replayed: false }
}
