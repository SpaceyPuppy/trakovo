const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

// Exercise the actual TS modules without adding a test framework or connecting to MySQL.
function loadSource(relativePath, mocks = {}) {
  const filename = path.join(__dirname, '..', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const localRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name)
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}

const configModule = loadSource('src/lib/taxi-booking-config.ts')
const { resolveTaxiBookingConfig, taxiPhoneHref } = configModule

test('upgrade defaults to phone bookings on the agreed number; only explicit enablement launches online', () => {
  assert.deepEqual(resolveTaxiBookingConfig({}), {
    onlineBookingEnabled: false, phone: '0488 838 442', phoneHref: 'tel:0488838442',
  })
  assert.equal(resolveTaxiBookingConfig({ taxi_online_booking_enabled: 'true' }).onlineBookingEnabled, false)
  assert.deepEqual(resolveTaxiBookingConfig({ taxi_online_booking_enabled: '1', taxi_booking_phone: ' +61 (488) 838-442 ' }), {
    onlineBookingEnabled: true, phone: '+61 (488) 838-442', phoneHref: 'tel:+61488838442',
  })
  assert.equal(taxiPhoneHref('javascript:alert(1)'), null)
  assert.equal(taxiPhoneHref('123'), null)
})

test('phone mode blocks public taxi submission before body parsing, booking writes, IDs or SMS', async () => {
  const unexpected = () => { throw new Error('Phone mode must not enter the booking flow') }
  const { POST } = loadSource('src/app/api/booking/taxi/route.ts', {
    '@/lib/taxi-booking': { getTaxiBookingConfig: async () => resolveTaxiBookingConfig({}) },
    '@/lib/db': { execute: unexpected, newId: unexpected, generatePublicId: unexpected, queryOne: unexpected },
    '@/lib/sms-templates': { sendSmsNotification: unexpected },
  })
  const response = await POST({ json: unexpected })
  assert.equal(response.status, 403)
  assert.equal((await response.json()).phone_href, 'tel:0488838442')
})

test('unavailable settings fail closed to phone mode without breaking public pages', async () => {
  const { getTaxiBookingConfig } = loadSource('src/lib/taxi-booking.ts', {
    react: { cache: fn => fn },
    './settings': { getSettings: async () => { throw new Error('Database unavailable') } },
    './taxi-booking-config': configModule,
  })
  assert.deepEqual(await getTaxiBookingConfig(), resolveTaxiBookingConfig({}))
})

test('enabling online bookings preserves the existing request submission', async () => {
  const writes = []
  const { POST } = loadSource('src/app/api/booking/taxi/route.ts', {
    '@/lib/taxi-booking': { getTaxiBookingConfig: async () => resolveTaxiBookingConfig({ taxi_online_booking_enabled: '1' }) },
    '@/lib/db': {
      execute: async (...args) => writes.push(args), newId: () => 'booking-id',
      generatePublicId: async () => 'VHB-123', queryOne: async () => null,
    },
    '@/lib/sms-templates': { sendSmsNotification: async () => {} },
  })
  const response = await POST({ json: async () => ({
    contact_name: 'Test Customer', contact_phone: '0400000000', pickup_address: 'Cohuna', dest_address: 'Kerang',
    pickup_lat: -35.8, pickup_lng: 144.2, dest_lat: -35.7, dest_lng: 143.9,
  }) })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).public_id, 'VHB-123')
  assert.equal(writes.length, 1)
  assert.match(writes[0][0], /INSERT INTO Booking/)
})

test('taxi route layout excludes the online app in phone mode and exposes crawlable phone content', async () => {
  let config = resolveTaxiBookingConfig({})
  const link = ({ children, ...props }) => React.createElement('a', props, children)
  const layout = loadSource('src/app/book/taxi/layout.tsx', {
    '@/lib/taxi-booking': { getTaxiBookingConfig: async () => config },
    'next/link': { default: link },
    '@/components/book/TaxiBookingLink': { default: ({ children }) => React.createElement('button', null, children) },
  })
  const children = React.createElement('div', null, 'ONLINE_MAP_FLOW')
  const html = renderToStaticMarkup(await layout.default({ children }))
  assert.doesNotMatch(html, /ONLINE_MAP_FLOW|coming\s+soon/i)
  assert.match(html, /href="tel:0488838442"/)
  assert.match((await layout.generateMetadata()).description, /0488 838 442/)
  config = resolveTaxiBookingConfig({ taxi_online_booking_enabled: '1' })
  assert.equal(await layout.default({ children }), children)
})

test('admin taxi settings require authentication and validate the number before saving', async () => {
  let authenticated = false
  let saved = []
  const { PUT } = loadSource('src/app/api/admin/settings/route.ts', {
    '@/lib/auth': { getAdminSession: async () => authenticated ? { username: 'admin' } : null },
    '@/lib/settings': { getSettings: async () => ({}), upsertSettings: async entries => { saved = entries } },
    '@/lib/taxi-booking-config': configModule,
  })
  const request = body => ({ json: async () => body })
  assert.equal((await PUT(request({ taxi_online_booking_enabled: '1' }))).status, 401)
  authenticated = true
  assert.equal((await PUT(request({ taxi_booking_phone: 'not a phone' }))).status, 400)
  assert.equal((await PUT(request({ taxi_booking_phone: '' }))).status, 400)
  assert.equal((await PUT(request({ taxi_online_booking_enabled: 'yes' }))).status, 400)
  assert.deepEqual(saved, [])
  const updates = { taxi_booking_phone: '0488 838 442', taxi_online_booking_enabled: '0' }
  assert.equal((await PUT(request(updates))).status, 200)
  assert.deepEqual(Object.fromEntries(saved), updates)
})
