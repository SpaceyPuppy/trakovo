import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(here, '..', 'prisma', 'init.sql')
const migrationsPath = path.join(here, '..', 'database', 'migrations')
const baselineVersion = '0000-baseline'
const migrationTable = 'TrakovoSchemaMigration'

const requiredTables = [
  'Vehicle',
  'VehicleMedia',
  'Booking',
  'PublicIdSequence',
  'BookingNote',
  'Setting',
  'PushSubscription',
  'Vendor',
  'VendorVehicle',
  'VendorClient',
  'VendorEnquiry',
  'ContactEnquiry',
  'AdminUser',
  'Driver',
  'DriverMessage',
  'VehicleBlockout',
  'BookingEmailLog',
  'CustomerNote',
  'CustomerArchive',
  'CustomerAlias',
  'CorporateEnquiry',
  'ServiceFeature',
  'BillingRun',
  'Invoice',
  'InvoiceLine',
  'Payment',
  'PaymentAllocation',
  'BillingEvent',
  'RequestIdempotency',
  'TripRating',
]

const config = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
  connectTimeout: 10_000,
  charset: 'utf8mb4',
}

if (!config.user || !config.database) {
  throw new Error('DB_USER and DB_NAME are required')
}

async function withConnection(work) {
  const connection = await mysql.createConnection(config)
  try {
    return await work(connection)
  } finally {
    await connection.end().catch(() => {})
  }
}

async function waitForDatabase() {
  let lastError
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await withConnection((connection) => connection.query('SELECT 1'))
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error(`Database did not become ready: ${lastError instanceof Error ? lastError.message : lastError}`)
}

async function tableCount(connection) {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?',
    [config.database]
  )
  return Number(rows[0]?.count || 0)
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${migrationTable}\` (
      \`version\` VARCHAR(191) NOT NULL,
      \`checksum\` CHAR(64) NOT NULL,
      \`applied_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

async function verifySchema(connection) {
  const [rows] = await connection.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
    [config.database]
  )
  const present = new Set(rows.map((row) => row.table_name))
  const missing = requiredTables.filter((table) => !present.has(table))
  if (missing.length > 0) {
    throw new Error(`Schema verification failed; missing tables: ${missing.join(', ')}`)
  }
}

async function readMigrations() {
  let names
  try {
    names = await readdir(migrationsPath)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const files = names
    .filter((name) => /^\d+[-_].+\.sql$/i.test(name))
    .sort()

  return Promise.all(files.map(async (name) => {
    const sql = await readFile(path.join(migrationsPath, name), 'utf8')
    return {
      name,
      version: name.replace(/\.sql$/i, ''),
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    }
  }))
}

async function readApplied(connection) {
  const [rows] = await connection.query(`SELECT version, checksum FROM \`${migrationTable}\``)
  return new Map(rows.map((row) => [row.version, row.checksum]))
}

async function markBaseline(connection) {
  await connection.query(
    `INSERT INTO \`${migrationTable}\` (version, checksum) VALUES (?, ?)`,
    [baselineVersion, createHash('sha256').update('Trakovo current schema baseline').digest('hex')]
  )
}

async function runInit() {
  await waitForDatabase()
  await withConnection(async (connection) => {
    const count = await tableCount(connection)
    if (count !== 0) {
      throw new Error(`Database is not empty (${count} tables). Use an import or migrate existing database mode.`)
    }

    const schema = await readFile(schemaPath, 'utf8')
    await connection.query(schema)
    await ensureMigrationTable(connection)
    await markBaseline(connection)
    await verifySchema(connection)
  })
  console.log('Database initialized and schema verified.')
}

async function runMigrate() {
  await waitForDatabase()
  await withConnection(async (connection) => {
    const lockName = `trakovo-schema:${config.database}`
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 60) AS acquired', [lockName])
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error('Could not acquire schema migration lock')

    try {
      const count = await tableCount(connection)
      if (count === 0) throw new Error('Database has no tables. Run init mode first.')

      await ensureMigrationTable(connection)
      const applied = await readApplied(connection)
      if (applied.size === 0) {
        await verifySchema(connection)
        await markBaseline(connection)
        console.log('Existing schema verified and recorded as baseline.')
      } else {
        await verifySchema(connection)
      }

      for (const migration of await readMigrations()) {
        const existingChecksum = applied.get(migration.version)
        if (existingChecksum) {
          if (existingChecksum !== migration.checksum) {
            throw new Error(`Applied migration was modified: ${migration.name}`)
          }
          continue
        }

        console.log(`Applying ${migration.name}...`)
        await connection.query(migration.sql)
        await connection.query(
          `INSERT INTO \`${migrationTable}\` (version, checksum) VALUES (?, ?)`,
          [migration.version, migration.checksum]
        )
      }
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {})
    }
  })
  console.log('Database migrations complete.')
}

async function runEmptyCheck() {
  await waitForDatabase()
  await withConnection(async (connection) => {
    const count = await tableCount(connection)
    if (count !== 0) throw new Error(`Database is not empty (${count} tables)`)
  })
  console.log('Database is empty and ready for import.')
}

async function runStatus() {
  await waitForDatabase()
  await withConnection(async (connection) => {
    await ensureMigrationTable(connection)
    const [rows] = await connection.query(
      `SELECT version, applied_at FROM \`${migrationTable}\` ORDER BY version`
    )
    console.table(rows)
  })
}

const command = process.argv[2] || 'help'
try {
  if (command === 'wait') await waitForDatabase()
  else if (command === 'init') await runInit()
  else if (command === 'migrate') await runMigrate()
  else if (command === 'empty') await runEmptyCheck()
  else if (command === 'status') await runStatus()
  else {
    console.log('Usage: db.mjs wait|init|migrate|empty|status')
    process.exitCode = command === 'help' ? 0 : 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
