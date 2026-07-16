import mysql from 'mysql2/promise'
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
})

export async function query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params)
  return rows as T[]
}

export async function queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  await pool.query(sql, params)
}

export interface DbTransaction {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>
  queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null>
  execute(sql: string, params?: unknown[]): Promise<ResultSetHeader>
}

function transactionClient(connection: PoolConnection): DbTransaction {
  return {
    async query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
      const [rows] = await connection.query(sql, params)
      return rows as T[]
    },
    async queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null> {
      const [rows] = await connection.query(sql, params)
      return (rows as T[])[0] ?? null
    },
    async execute(sql: string, params?: unknown[]): Promise<ResultSetHeader> {
      const [result] = await connection.query(sql, params)
      return result as ResultSetHeader
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
