import { NextResponse } from 'next/server'
import { getAdminSession } from './auth'
import type { AdminSession } from '@/types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = 'BAD_REQUEST',
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RouteContext<P> = { params: P }
type AdminHandler<P> = (
  request: Request,
  context: RouteContext<P>,
  session: AdminSession
) => Promise<Response>

function errorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details, request_id: requestId },
      { status: error.status }
    )
  }

  console.error(`[api:${requestId}] Unhandled route error`, error)
  return NextResponse.json(
    { error: 'Unexpected server error', code: 'INTERNAL_ERROR', request_id: requestId },
    { status: 500 }
  )
}

/** Authenticate, time and consistently format failures for an admin route. */
export function withAdminApi<P = Record<string, string>>(
  handler: AdminHandler<P>
): (request: Request, context: RouteContext<P>) => Promise<Response> {
  return async (request, context) => {
    const requestId = request.headers.get('x-request-id')?.slice(0, 100) || crypto.randomUUID()
    const startedAt = performance.now()
    try {
      const session = await getAdminSession()
      if (!session) throw new ApiError('Unauthorised', 401, 'UNAUTHORISED')
      const response = await handler(request, context, session)
      response.headers.set('x-request-id', requestId)
      return response
    } catch (error) {
      return errorResponse(error, requestId)
    } finally {
      const duration = Math.round((performance.now() - startedAt) * 10) / 10
      if (duration >= 500) {
        console.warn(`[api:${requestId}] Slow ${request.method} ${new URL(request.url).pathname} (${duration}ms)`)
      }
    }
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    throw new ApiError('Request body must be valid JSON', 400, 'INVALID_JSON')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError('Request body must be an object', 400, 'INVALID_BODY')
  }
  return value as Record<string, unknown>
}

export function requireString(
  value: unknown,
  name: string,
  options: { maxLength?: number; allowEmpty?: boolean } = {}
): string {
  if (typeof value !== 'string') throw new ApiError(`${name} must be a string`)
  const result = value.trim()
  if (!options.allowEmpty && !result) throw new ApiError(`${name} is required`)
  if (options.maxLength && result.length > options.maxLength) {
    throw new ApiError(`${name} must be ${options.maxLength} characters or fewer`)
  }
  return result
}

export function optionalString(value: unknown, name: string, maxLength = 5000): string {
  if (value === undefined || value === null) return ''
  return requireString(value, name, { maxLength, allowEmpty: true })
}

export function cents(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ApiError(`${name} must be a non-negative whole number of cents`)
  }
  return value
}

export function pagination(searchParams: URLSearchParams, defaultLimit = 50, maxLimit = 200) {
  const requestedPage = Number(searchParams.get('page') ?? 1)
  const requestedLimit = Number(searchParams.get('limit') ?? defaultLimit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(maxLimit, Math.max(1, requestedLimit))
    : defaultLimit
  return { page, limit, offset: (page - 1) * limit }
}
