const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(__dirname, '..', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, fileName: filename,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports)
  return module.exports
}

const api = loadSource('src/lib/api-route.ts', { './auth': { getAdminSession: async () => ({ username: 'admin' }) } })
const occasions = loadSource('src/lib/special-occasions.ts')
const showcase = loadSource('src/lib/vehicle-showcase.ts')
const vehicle = (id, options = {}) => ({ id, name: id, slug: id, is_available: true, public_bookings_enabled: true, feature_on_homepage: true, show_on_special_occasions: true, media: [], meta: {}, ...options })
const link = ({ children, ...props }) => React.createElement('a', props, children)
const request = body => new Request('http://localhost/api/enquiry/special-occasions', { method: 'POST', body: JSON.stringify(body) })
const valid = { name: 'Jane', email: 'jane@example.com', occasion: 'weddings', event_date: '2027-02-20', passengers: '4', message: 'Classic car, please', vehicle_id: 'classic' }

test('showcase selections are opt-in, obey both visibility switches, and filter before limiting', () => {
  const vehicles = [vehicle('Wheelchair', { is_available: false }), vehicle('Hidden', { public_bookings_enabled: false }), vehicle('Unselected', { feature_on_homepage: false, show_on_special_occasions: false }), vehicle('Classic'), vehicle('Luxury')]
  assert.deepEqual(showcase.showcaseVehicles(vehicles, 'feature_on_homepage', 1).map(item => item.id), ['Classic'])
  assert.deepEqual(showcase.showcaseVehicles(vehicles, 'show_on_special_occasions').map(item => item.id), ['Classic', 'Luxury'])
})

test('direct public vehicle lookups enforce visibility while Admin can still load inactive records', async () => {
  const { getVehicle, adminGetVehicle } = loadSource('src/lib/api.ts', {
    './db': { query: async sql => {
      if (/FROM VehicleMedia/.test(sql)) return []
      if (/slug =/.test(sql)) {
        assert.match(sql, /is_available = 1 AND public_bookings_enabled = 1/)
        return []
      }
      return [{ id: 'inactive', is_available: 0, public_bookings_enabled: 1, feature_on_homepage: 1, show_on_special_occasions: 1 }]
    } },
    './booking-mapper': { mapBookingRow: () => {} },
  })
  await assert.rejects(getVehicle('inactive'), /Vehicle not found/)
  assert.equal((await adminGetVehicle('inactive')).is_available, false)
})

test('homepage and event page render eligible showcase vehicles only; event page handles an empty selection', async () => {
  const vehicles = [vehicle('Wheelchair', { is_available: false }), vehicle('Classic')]
  const common = {
    'next/link': { default: link }, '@/components/ui/NavWrapper': { default: () => null }, '@/components/ui/Footer': { default: () => null },
    '@/lib/api': { getVehicles: async () => vehicles }, '@/lib/vehicle-showcase': showcase,
  }
  const home = loadSource('src/app/page.tsx', {
    ...common, '@/components/ui/VehicleCard': { default: ({ vehicle }) => React.createElement('p', null, vehicle.name) },
    './ServicesPanel': { default: () => null }, '@/lib/db': { queryOne: async () => null }, '@/lib/taxi-booking': { getTaxiBookingConfig: async () => ({}) },
  })
  const homeHtml = renderToStaticMarkup(await home.default())
  assert.match(homeHtml, /Classic/)
  assert.doesNotMatch(homeHtml, /Wheelchair/)
  const page = loadSource('src/app/special-occasions/page.tsx', {
    ...common, '@/lib/special-occasions': occasions, '@/lib/utils': { getVehicleImage: () => null },
    './OccasionEnquiryForm': { default: () => React.createElement('form', null, 'Event form') },
  })
  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }))
  for (const label of ['Weddings', 'Debutante Balls', 'School Formals', 'Graduations', 'Corporate Functions']) assert.ok(html.includes(label))
  assert.doesNotMatch(html, /Wheelchair|Book Now/)
  assert.match(html, /vehicle=Classic#enquiry/)
  vehicles.length = 0
  const emptyHtml = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }))
  assert.match(emptyHtml, /Event form/)
  assert.doesNotMatch(emptyHtml, /Selected vehicles/)
})

test('event enquiries reject invalid, oversized and no-longer-visible selections before saving', async () => {
  const saves = []
  let available = false
  const route = loadSource('src/app/api/enquiry/special-occasions/route.ts', {
    '@/lib/api-route': api, '@/lib/special-occasions': occasions,
    '@/lib/db': { queryOne: async (sql, params) => {
      assert.match(sql, /is_available = 1 AND public_bookings_enabled = 1 AND show_on_special_occasions = 1/)
      assert.deepEqual(params, ['classic'])
      return available ? { name: 'Classic Saloon' } : null
    } },
    '@/lib/contact-enquiry': { saveContactEnquiry: async (...args) => { saves.push(args); return 'CNT-123' } },
  })
  for (const patch of [{ email: 'bad' }, { occasion: 'invented' }, { passengers: '-1' }, { event_date: '2027-02-30' }, { message: ' ' }, { name: 123 }]) {
    assert.equal((await route.POST(request({ ...valid, ...patch }))).status, 400)
  }
  assert.equal((await route.POST(request({ ...valid, message: 'x'.repeat(21000) }))).status, 413)
  assert.equal((await route.POST(new Request('http://localhost', { method: 'POST', body: '{' }))).status, 400)
  assert.equal((await route.POST(request(valid))).status, 400)
  assert.equal((await route.POST(request({ ...valid, website: 'spam' }))).status, 200)
  assert.equal(saves.length, 0)
  available = true
  const response = await route.POST(request(valid))
  assert.equal(response.status, 201)
  assert.equal((await response.json()).public_id, 'CNT-123')
  assert.match(saves[0][0].message, /Special Occasions — Weddings\nEvent date: 2027-02-20/)
  assert.match(saves[0][0].message, /Preferred vehicle: Classic Saloon/)
  assert.equal(saves[0][1], 'Special Occasions')
})

test('enquiries are persisted in the existing inbox, HTML is escaped, and mail failure does not lose the enquiry', async () => {
  const writes = []
  const sent = []
  let mailFails = false
  const { saveContactEnquiry } = loadSource('src/lib/contact-enquiry.ts', {
    './db': { execute: async (...args) => writes.push(args), generatePublicId: async () => 'CNT-123', newId: () => 'id', queryOne: async () => ({ value: 'admin@example.com' }) },
    './email': { sendEmail: async (...args) => { if (mailFails) throw new Error('offline'); sent.push(args) } },
    './site': { getSiteName: async () => 'Test' },
  })
  const enquiry = { name: '<b>Jane</b>', email: 'jane@example.com', phone: '', message: '<img src=x onerror=alert(1)>' }
  assert.equal(await saveContactEnquiry(enquiry, 'Special Occasions'), 'CNT-123')
  assert.match(writes[0][0], /INSERT INTO ContactEnquiry/)
  assert.equal(writes[0][1][5], enquiry.message)
  assert.match(sent[0][2], /&lt;img/)
  assert.doesNotMatch(sent[0][2], /<img|<b>Jane/)
  mailFails = true
  const originalError = console.error
  console.error = () => {}
  try { assert.equal(await saveContactEnquiry(enquiry), 'CNT-123') } finally { console.error = originalError }
  assert.equal(writes.length, 2)
})

test('vehicle create and update persist both showcase switches with matching SQL parameters', async () => {
  const writes = []
  const transaction = {
    queryOne: async sql => /SELECT \*/.test(sql) ? { id: 'id', is_available: 1 } : /SELECT id FROM Vehicle WHERE id/.test(sql) ? { id: 'id' } : null,
    query: async () => [], execute: async (sql, params) => { assert.equal((sql.match(/\?/g) || []).length, params.length); writes.push({ sql, params }) },
  }
  const admin = loadSource('src/lib/vehicle-admin.ts', {
    './api-route': api, './db': { withTransaction: callback => callback(transaction), newId: () => 'id', generatePublicId: async () => 'VHC-123' }, './utils': { slugify: () => 'classic' },
  })
  const input = admin.parseVehicleInput({ name: 'Classic', feature_on_homepage: true, show_on_special_occasions: true }, false)
  await admin.createVehicle(input)
  await admin.updateVehicle('id', input)
  for (const write of writes.filter(write => /INSERT INTO Vehicle \(|UPDATE Vehicle SET/.test(write.sql))) {
    assert.match(write.sql, /feature_on_homepage/)
    assert.match(write.sql, /show_on_special_occasions/)
  }
  assert.equal(admin.parseVehicleInput({ name: 'New' }, false).featureOnHomepage, false)
})

test('admin route wrapper authenticates and resolves asynchronous route parameters', async () => {
  const GET = api.withAdminApi(async (_request, { params }) => Response.json({ id: params.id }))
  const response = await GET(new Request('http://localhost/api/admin/test'), { params: Promise.resolve({ id: '123' }) })
  assert.deepEqual(await response.json(), { id: '123' })
  let entered = false
  const deniedApi = loadSource('src/lib/api-route.ts', { './auth': { getAdminSession: async () => null } })
  const DENIED = deniedApi.withAdminApi(async () => { entered = true; return Response.json({}) })
  assert.equal((await DENIED(new Request('http://localhost/api/admin/test'), { params: Promise.resolve({}) })).status, 401)
  assert.equal(entered, false)
})

test('all three portals read/write asynchronous cookies; tokens reject tampering and the wrong portal', async () => {
  const codec = loadSource('src/lib/signed-token.ts')
  const stored = new Map()
  let authorization = ''
  const headers = {
    cookies: async () => ({ get: name => stored.has(name) ? { value: stored.get(name) } : undefined, set: (name, value) => stored.set(name, value) }),
    headers: async () => new Headers(authorization ? { Authorization: authorization } : {}),
  }
  const mocks = { 'next/headers': headers, './signed-token': codec }
  const admin = loadSource('src/lib/auth.ts', mocks)
  const vendor = loadSource('src/lib/vendor-auth.ts', mocks)
  const driver = loadSource('src/lib/driver-auth.ts', mocks)
  const adminToken = await admin.createToken('admin')
  await admin.setSessionCookie(adminToken)
  assert.equal((await admin.getAdminSession()).username, 'admin')
  await admin.clearSessionCookie()
  assert.equal(await admin.getAdminSession(), null)
  authorization = `Bearer ${adminToken}`
  assert.equal((await admin.getAdminSession()).username, 'admin')
  const vendorToken = await vendor.createVendorToken('vendor-id', 'Vendor')
  await vendor.setVendorSessionCookie(vendorToken)
  assert.equal((await vendor.getVendorSession()).vendorId, 'vendor-id')
  await vendor.clearVendorSessionCookie()
  assert.equal(await vendor.getVendorSession(), null)
  const driverToken = await driver.createDriverToken('driver-id', 'Driver')
  await driver.setDriverSessionCookie(driverToken)
  assert.equal((await driver.getDriverSession()).driverId, 'driver-id')
  await driver.clearDriverSessionCookie()
  assert.equal(await driver.getDriverSession(), null)
  assert.equal(await admin.verifyToken(vendorToken), null)
  assert.equal(await vendor.verifyVendorToken(driverToken), null)
  const [payload, signature] = adminToken.split('.')
  assert.equal(await admin.verifyToken(`${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`), null)
  assert.equal(await admin.verifyToken(await admin.createToken('expired', -1000)), null)
})
