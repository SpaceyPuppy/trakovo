import mysql from 'mysql2/promise'

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

export function newId(): string {
  return crypto.randomUUID()
}

export async function generatePublicId(
  prefix: 'VHB' | 'VHC' | 'VND' | 'VNC' | 'VNE' | 'DRV'
): Promise<string> {
  const tableMap: Record<string, string> = {
    VHB: 'Booking',
    VHC: 'Vehicle',
    VND: 'Vendor',
    VNC: 'VendorClient',
    VNE: 'VendorEnquiry',
    DRV: 'Driver',
  }
  const table = tableMap[prefix]
  const row = await queryOne<{ max_num: number | null }>(
    `SELECT MAX(CAST(SUBSTRING(public_id, 5) AS UNSIGNED)) as max_num FROM \`${table}\` WHERE public_id LIKE '${prefix}-%'`
  )
  const next = (row?.max_num ?? 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
