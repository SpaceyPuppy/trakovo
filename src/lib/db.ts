import mysql from 'mysql2/promise'
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const parsedConnectionLimit = Number(process.env.DB_CONNECTION_LIMIT ?? 5)
const connectionLimit = Number.isInteger(parsedConnectionLimit)
  ? Math.min(20, Math.max(1, parsedConnectionLimit))
  : 5
const parsedSlowQueryMs = Number(process.env.DB_SLOW_QUERY_MS ?? 250)
const slowQueryMs = Number.isFinite(parsedSlowQueryMs) && parsedSlowQueryMs >= 0
  ? parsedSlowQueryMs
  : 250

interface DbDiagnosticEvent {
  statement: string
  duration_ms: number
  failed: boolean
  recorded_at: string
}

interface DbDiagnosticsState {
  query_count: number
  error_count: number
  slow_query_count: number
  total_duration_ms: number
  max_duration_ms: number
  recent_slow_queries: DbDiagnosticEvent[]
}

const diagnostics: DbDiagnosticsState = {
  query_count: 0,
  error_count: 0,
  slow_query_count: 0,
  total_duration_ms: 0,
  max_duration_ms: 0,
  recent_slow_queries: [],
}

function statementLabel(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function recordQuery(sql: string, startedAt: number, failed: boolean): void {
  const duration = Math.round((performance.now() - startedAt) * 10) / 10
  diagnostics.query_count += 1
  diagnostics.total_duration_ms += duration
  diagnostics.max_duration_ms = Math.max(diagnostics.max_duration_ms, duration)
  if (failed) diagnostics.error_count += 1

  if (duration >= slowQueryMs || failed) {
    if (duration >= slowQueryMs) diagnostics.slow_query_count += 1
    const event = {
      statement: statementLabel(sql),
      duration_ms: duration,
      failed,
      recorded_at: new Date().toISOString(),
    }
    diagnostics.recent_slow_queries = [event, ...diagnostics.recent_slow_queries].slice(0, 20)
    console.warn(`[db] ${failed ? 'Failed' : 'Slow'} query (${duration}ms): ${event.statement}`)
  }
}

async function measured<T>(sql: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()
  try {
    const result = await operation()
    recordQuery(sql, startedAt, false)
    return result
  } catch (error) {
    recordQuery(sql, startedAt, true)
    throw error
  }
}

export function getDbDiagnostics(): DbDiagnosticsState & {
  average_duration_ms: number
  slow_query_threshold_ms: number
  connection_limit: number
} {
  return {
    ...diagnostics,
    recent_slow_queries: [...diagnostics.recent_slow_queries],
    average_duration_ms: diagnostics.query_count > 0
      ? Math.round((diagnostics.total_duration_ms / diagnostics.query_count) * 10) / 10
      : 0,
    slow_query_threshold_ms: slowQueryMs,
    connection_limit: connectionLimit,
  }
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
})

export async function query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
  return measured(sql, async () => {
    const [rows] = await pool.query(sql, params)
    return rows as T[]
  })
}

export async function queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  await measured(sql, async () => {
    await pool.query(sql, params)
  })
}

export interface DbTransaction {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>
  queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null>
  execute(sql: string, params?: unknown[]): Promise<ResultSetHeader>
}

function transactionClient(connection: PoolConnection): DbTransaction {
  return {
    async query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
      return measured(sql, async () => {
        const [rows] = await connection.query(sql, params)
        return rows as T[]
      })
    },
    async queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null> {
      return measured(sql, async () => {
        const [rows] = await connection.query(sql, params)
        return (rows as T[])[0] ?? null
      })
    },
    async execute(sql: string, params?: unknown[]): Promise<ResultSetHeader> {
      return measured(sql, async () => {
        const [result] = await connection.query(sql, params)
        return result as ResultSetHeader
      })
    },
  }
}

export async function withTransaction<T>(work: (transaction: DbTransaction) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await work(transactionClient(connection))
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

export type PublicIdPrefix =
  | 'VHB'
  | 'VHC'
  | 'VND'
  | 'VNC'
  | 'VNE'
  | 'DRV'
  | 'CRQ'
  | 'INV'
  | 'CNT'

async function allocatePublicId(
  transaction: DbTransaction,
  prefix: PublicIdPrefix
): Promise<string> {
  // LAST_INSERT_ID(expr) is scoped to this connection. The primary-key row
  // serialises allocations for each prefix without scanning the target table.
  await transaction.execute(
    `INSERT INTO PublicIdSequence (prefix, last_value, updated_at)
     VALUES (?, LAST_INSERT_ID(1), NOW())
     ON DUPLICATE KEY UPDATE
       last_value = LAST_INSERT_ID(last_value + 1),
       updated_at = NOW()`,
    [prefix]
  )
  const allocated = await transaction.queryOne<{ value: number | string }>(
    'SELECT LAST_INSERT_ID() AS value'
  )
  const value = Number(allocated?.value)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Failed to allocate a public ID for ${prefix}`)
  }
  return `${prefix}-${String(value).padStart(4, '0')}`
}

export async function generatePublicId(
  prefix: PublicIdPrefix,
  transaction?: DbTransaction
): Promise<string> {
  if (transaction) return allocatePublicId(transaction, prefix)
  return withTransaction((standaloneTransaction) =>
    allocatePublicId(standaloneTransaction, prefix)
  )
}

/**
 * Return the next likely public ID without reserving it. This is intended for
 * form previews only; callers must still allocate the final ID transactionally
 * when the record is created.
 */
export async function previewPublicId(prefix: PublicIdPrefix): Promise<string> {
  const sequence = await queryOne<{ last_value: number | string }>(
    'SELECT last_value FROM PublicIdSequence WHERE prefix = ?',
    [prefix]
  )
  const lastValue = Number(sequence?.last_value ?? 0)
  const nextValue = Number.isSafeInteger(lastValue) && lastValue >= 0 ? lastValue + 1 : 1
  return `${prefix}-${String(nextValue).padStart(4, '0')}`
}
