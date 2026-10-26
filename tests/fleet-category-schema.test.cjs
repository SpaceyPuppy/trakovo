const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const mysql = require('mysql2/promise')

// CI uses a disposable local MariaDB service. Never use the application's DB credentials.
const enabled = process.env.TRAKOVO_SCHEMA_TEST === '1'
const migration = name => fs.readFileSync(path.join(__dirname, '../database/migrations', name), 'utf8')
const repair = migration('0005-v1.20.0-category-engine-repair.sql')
const original = migration('0004-v1.20.0-fleet-categories.sql')

async function fixture(work) {
  const database = `trakovo_schema_test_${randomUUID().replaceAll('-', '')}`
  assert.match(database, /^trakovo_schema_test_[a-f0-9]{32}$/)
  const connection = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: process.env.TRAKOVO_SCHEMA_TEST_PASSWORD,
    multipleStatements: true,
  })
  try {
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`USE \`${database}\``)
    await connection.query("SET SESSION default_storage_engine = 'MyISAM'")
    await work(connection)
  } finally {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await connection.end()
  }
}

async function engines(connection) {
  const [tables] = await connection.query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')
  for (const table of tables) assert.equal(table.ENGINE, 'InnoDB', table.TABLE_NAME)
}

const vehicleSql = 'CREATE TABLE Vehicle (id VARCHAR(191) NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; INSERT INTO Vehicle VALUES (\'vehicle-a\'), (\'vehicle-b\')'

test('repair reproduces the MyISAM failure, preserves data, supports repeat execution and enforces both cascades', { skip: !enabled }, async () => {
  await fixture(async connection => {
    await connection.query(vehicleSql)
    await assert.rejects(connection.query(original), error => error.code === 'ER_TOO_LONG_KEY')
    await connection.query("INSERT INTO FleetCategory VALUES ('custom-bus', 'Bus', 'chauffeured'), ('executive', 'Executive', 'chauffeured')")
    await connection.query(repair)
    await engines(connection)
    await connection.query("INSERT INTO VehicleFleetCategory VALUES ('vehicle-a', 'custom-bus'), ('vehicle-b', 'executive')")
    await connection.query(repair)
    const [categories] = await connection.query('SELECT * FROM FleetCategory ORDER BY id')
    assert.deepEqual(categories.map(category => category.id), ['custom-bus', 'executive'])
    assert.equal(categories[0].homepage_group, 'chauffeured')
    const [[assignments]] = await connection.query('SELECT COUNT(*) AS count FROM VehicleFleetCategory')
    assert.equal(assignments.count, 2)
    await connection.query("DELETE FROM FleetCategory WHERE id = 'executive'")
    await connection.query("DELETE FROM Vehicle WHERE id = 'vehicle-a'")
    const [[remaining]] = await connection.query('SELECT COUNT(*) AS count FROM VehicleFleetCategory')
    assert.equal(remaining.count, 0)
    const [[vehicles]] = await connection.query('SELECT COUNT(*) AS count FROM Vehicle')
    assert.equal(vehicles.count, 1)
  })
})

test('repair creates absent category tables and seeds Bus once with a MyISAM session default', { skip: !enabled }, async () => {
  await fixture(async connection => {
    await connection.query(vehicleSql)
    await connection.query(repair)
    await connection.query(repair)
    await engines(connection)
    const [categories] = await connection.query('SELECT * FROM FleetCategory')
    assert.deepEqual(categories.map(category => [category.id, category.name, category.homepage_group]), [['bus', 'Bus', 'buses']])
  })
})

test('fresh vehicle/category schema explicitly uses InnoDB even with a MyISAM session default', { skip: !enabled }, async () => {
  await fixture(async connection => {
    const schema = fs.readFileSync(path.join(__dirname, '../prisma/init.sql'), 'utf8')
    const end = schema.indexOf('CREATE TABLE `VehicleMedia`')
    assert.ok(end > 0)
    await connection.query(schema.slice(0, end))
    await engines(connection)
  })
})
