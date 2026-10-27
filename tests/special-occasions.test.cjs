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
const collections = loadSource('src/lib/fleet-collections.ts')
const serviceButtons = loadSource('src/lib/service-buttons.ts')
const utils = loadSource('src/lib/utils.ts')
const vehicle = (id, options = {}) => ({ id, name: id, slug: id, is_available: true, public_bookings_enabled: true, feature_on_homepage: true, show_on_special_occasions: true, enquiry_only: false, fleet_categories: [], media: [], meta: {}, ...options })
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
      if (/FROM VehicleMedia|FROM FleetCategory/.test(sql)) return []
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

test('homepage has three category links and event page renders eligible showcases, including an empty selection', async () => {
  const vehicles = [vehicle('Wheelchair', { is_available: false }), vehicle('Classic')]
  const common = {
    'next/link': { default: link }, '@/components/ui/NavWrapper': { default: () => null }, '@/components/ui/Footer': { default: () => null },
    '@/lib/api': { getVehicles: async () => vehicles }, '@/lib/vehicle-showcase': showcase,
  }
  const home = loadSource('src/app/page.tsx', {
    ...common, '@/components/ui/VehicleCard': { default: ({ vehicle }) => React.createElement('p', null, vehicle.name) },
    './ServicesPanel': { default: () => null }, '@/lib/db': { queryOne: async () => null }, '@/lib/taxi-booking': { getTaxiBookingConfig: async () => ({}) },
    '@/lib/fleet-collections': collections, '@/lib/utils': utils,
  })
  const homeHtml = renderToStaticMarkup(await home.default())
  for (const group of collections.FLEET_COLLECTIONS) {
    assert.ok(homeHtml.includes(group.label))
    assert.ok(homeHtml.includes(`/vehicles?priority=${group.id}`))
  }
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
      assert.match(sql, /is_available = 1 AND public_bookings_enabled = 1 AND \(show_on_special_occasions = 1 OR enquiry_only = 1\)/)
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
  assert.deepEqual(sent[0][3], { replyTo: enquiry.email })
  mailFails = true
  const originalError = console.error
  console.error = () => {}
  try { assert.equal(await saveContactEnquiry(enquiry), 'CNT-123') } finally { console.error = originalError }
  assert.equal(writes.length, 2)
})

test('vehicle create and update persist showcase/enquiry switches and category assignments with matching SQL parameters', async () => {
  const writes = []
  const transaction = {
    queryOne: async sql => /SELECT \*/.test(sql) ? { id: 'id', is_available: 1 } : /SELECT id FROM Vehicle WHERE id/.test(sql) ? { id: 'id' } : null,
    query: async sql => /FROM FleetCategory/.test(sql) ? [{ id: 'bus' }] : [], execute: async (sql, params) => { assert.equal((sql.match(/\?/g) || []).length, params.length); writes.push({ sql, params }) },
  }
  const admin = loadSource('src/lib/vehicle-admin.ts', {
    './api-route': api, './db': { withTransaction: callback => callback(transaction), newId: () => 'id', generatePublicId: async () => 'VHC-123' }, './utils': { slugify: () => 'classic' },
  })
  const input = admin.parseVehicleInput({ name: 'Classic', feature_on_homepage: true, show_on_special_occasions: true, enquiry_only: true, category_ids: ['bus', 'bus'] }, false)
  await admin.createVehicle(input)
  await admin.updateVehicle('id', input)
  for (const write of writes.filter(write => /INSERT INTO Vehicle \(|UPDATE Vehicle SET/.test(write.sql))) {
    assert.match(write.sql, /feature_on_homepage/)
    assert.match(write.sql, /show_on_special_occasions/)
    assert.match(write.sql, /enquiry_only/)
  }
  assert.equal(admin.parseVehicleInput({ name: 'New' }, false).featureOnHomepage, false)
  assert.equal(admin.parseVehicleInput({ name: 'New' }, false).enquiryOnly, false)
  assert.deepEqual(input.categoryIds, ['bus'])
  assert.equal(writes.filter(write => /INSERT INTO VehicleFleetCategory/.test(write.sql)).length, 2)
  await assert.rejects(admin.updateVehicle('id', { ...input, categoryIds: ['removed', 'bus'] }), /fleet category has changed/)
  assert.throws(() => admin.parseVehicleInput({ name: 'Bad', category_ids: 'bus' }, false), /fleet categories/)
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

test('public cards say Enquire for enquiry-only vehicles while retaining their vehicle detail links', () => {
  const selected = vehicle('Classic', { enquiry_only: true, price: 100, chauffeur_price: 200 })
  const common = { 'next/link': { default: link }, '@/lib/utils': utils, '@/lib/service-buttons': serviceButtons }
  for (const file of ['src/components/ui/VehicleCard.tsx', 'src/app/book/MobileVehicleList.tsx', 'src/app/book/hire/MobileVehicleList.tsx']) {
    const component = loadSource(file, common).default
    const html = renderToStaticMarkup(React.createElement(component, { vehicle: selected, vehicles: [selected] }))
    assert.match(html, /Enquire/)
    assert.doesNotMatch(html, /Book Now|Book →/)
    assert.match(html, /href="\/(vehicles|book(?:\/hire)?)\/Classic"/)
  }
})

test('enquiry-only panel renders the shared form with preferred vehicle selected without mounting booking hooks or calendars', () => {
  const form = loadSource('src/app/special-occasions/OccasionEnquiryForm.tsx', { '@/lib/special-occasions': occasions })
  const panel = loadSource('src/components/booking/VehicleEnquiryPanel.tsx', { '@/app/special-occasions/OccasionEnquiryForm': form })
  const unexpected = () => { throw new Error('Standard booking panel must not mount') }
  const booking = loadSource('src/components/booking/BookingPanel.tsx', {
    'next/navigation': { useRouter: unexpected }, 'next/link': { default: link },
    './Calendar': { default: unexpected }, './HireAgreementModal': { default: unexpected }, './VehicleEnquiryPanel': panel,
    '@/types': {}, '@/lib/utils': utils,
  })
  const html = renderToStaticMarkup(React.createElement(booking.default, { vehicle: vehicle('Classic', { enquiry_only: true }), availability: [], hireAgreementClauses: [] }))
  assert.match(html, /Send Event Enquiry/)
  assert.match(html, /<option value="Classic" selected="">Classic<\/option>/)
  assert.doesNotMatch(html, /Book This Vehicle|Request.*Booking|calendar/i)
})

test('vehicle routes do not load booking availability for enquiry-only vehicles', async () => {
  const selected = vehicle('Classic', { enquiry_only: true, chauffeur_price: 100 })
  const common = {
    'next/link': { default: link }, 'next/navigation': { notFound: () => { throw new Error('Not found') } },
    '@/lib/api': { getVehicle: async () => selected, getAvailability: () => { throw new Error('Availability must not be queried') } },
    '@/lib/db': { queryOne: async () => null }, '@/lib/hire-agreement-defaults': { parseHireAgreement: () => [] },
    '@/lib/site': { getSiteName: async () => 'Test', getLogoUrl: async () => '' }, '@/lib/utils': utils,
    '@/components/ui/NavWrapper': { default: () => null }, '@/components/ui/Footer': { default: () => null },
    '@/components/booking/BookingPanel': { default: () => null },
  }
  const content = { default: ({ vehicle }) => React.createElement('p', null, `Details for ${vehicle.id}`) }
  for (const file of ['src/app/vehicles/[slug]/page.tsx', 'src/app/book/hire/[slug]/page.tsx']) {
    const page = loadSource(file, { ...common, './VehiclePageContent': content, '@/app/vehicles/[slug]/VehiclePageContent': content })
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: 'Classic' }) }))
    assert.match(html, /Details for Classic/)
  }
})

test('enquiry-only vehicles can be preselected on the event page without being added to its showcase', async () => {
  const vehicles = [vehicle('Unshowcased', { enquiry_only: true, show_on_special_occasions: false }), vehicle('Hidden', { enquiry_only: true, public_bookings_enabled: false })]
  assert.deepEqual(showcase.occasionEnquiryVehicles(vehicles).map(item => item.id), ['Unshowcased'])
  const form = loadSource('src/app/special-occasions/OccasionEnquiryForm.tsx', { '@/lib/special-occasions': occasions })
  const page = loadSource('src/app/special-occasions/page.tsx', {
    'next/link': { default: link }, '@/components/ui/NavWrapper': { default: () => null }, '@/components/ui/Footer': { default: () => null },
    '@/lib/api': { getVehicles: async () => vehicles }, '@/lib/vehicle-showcase': showcase, '@/lib/special-occasions': occasions,
    '@/lib/utils': utils, './OccasionEnquiryForm': form,
  })
  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({ vehicle: 'Unshowcased' }) }))
  assert.match(html, /<option value="Unshowcased" selected="">/)
  assert.doesNotMatch(html, /Selected vehicles|Hidden/)
})

test('locked vehicle validation blocks every public booking variant for enquiry-only vehicles but preserves staff/vendor access', async () => {
  const validation = loadSource('src/lib/booking-availability.ts')
  const selected = { id: 'classic', name: 'Classic', enquiry_only: 1, is_available: 1, public_bookings_enabled: 1, vendor_bookings_enabled: 1, hire_modes: 'both' }
  const transaction = { queryOne: async sql => /FROM Vehicle\s/.test(sql) ? selected : /FROM VendorVehicle/.test(sql) ? { is_enabled: 1 } : null }
  const base = { vehicleId: 'classic', startDate: '2027-02-20', endDate: '2027-02-20', checkConflicts: false }
  for (const hireType of ['chauffeured', 'dry-hire']) for (const isEnquiry of [false, true]) {
    await assert.rejects(validation.lockAndValidateBookingVehicle(transaction, { ...base, channel: 'public', hireType, isEnquiry }), error => error.code === 'VEHICLE_ENQUIRY_ONLY' && error.status === 409)
  }
  for (const channel of ['admin', 'vendor']) assert.equal((await validation.lockAndValidateBookingVehicle(transaction, { ...base, channel, vendorId: 'vendor', hireType: 'chauffeured', isEnquiry: false })).vehicle.id, 'classic')
  selected.enquiry_only = 0
  assert.equal((await validation.lockAndValidateBookingVehicle(transaction, { ...base, channel: 'public', hireType: 'chauffeured', isEnquiry: false })).vehicle.id, 'classic')
})

test('homepage priorities retain the full fleet, order matches stably, and use category assignments rather than names', () => {
  const vehicles = [vehicle('Normal', { show_on_special_occasions: false, meta: { hire_modes: 'both' } }), vehicle('Occasion', { enquiry_only: true }), vehicle('Not a bus despite its name', { show_on_special_occasions: false }), vehicle('Group transport', { fleet_categories: [{ id: 'bus', name: 'Bus', homepage_group: 'buses' }] })]
  assert.deepEqual(collections.prioritiseFleet(vehicles, 'buses').map(item => item.id), ['Group transport', 'Normal', 'Occasion', 'Not a bus despite its name'])
  assert.equal(collections.prioritiseFleet(vehicles, 'chauffeured')[0].id, 'Normal')
  assert.equal(collections.prioritiseFleet(vehicles, 'special-occasions')[0].id, 'Occasion')
  assert.deepEqual(collections.prioritiseFleet(vehicles, 'invalid'), vehicles)
  assert.equal(vehicles[0].id, 'Normal')
})

test('public booking endpoint rejects stale enquiry-only submissions before writes or notifications', async () => {
  const validation = loadSource('src/lib/booking-availability.ts')
  const unexpected = () => { throw new Error('Enquiry-only vehicle must not create a booking or send notifications') }
  const transaction = { queryOne: async () => ({ id: 'classic', enquiry_only: 1, is_available: 1, public_bookings_enabled: 1 }), execute: unexpected }
  const route = loadSource('src/app/api/booking/route.ts', {
    '@/lib/db': { withTransaction: callback => callback(transaction), generatePublicId: unexpected, newId: unexpected },
    '@/lib/booking-availability': validation, '@/lib/email': { sendBookingNotification: unexpected },
    '@/lib/email-sequences': { sendBookingReceived: unexpected }, '@/lib/calendar': { syncBookingToCalendar: unexpected },
    '@/lib/push': { sendPushNotification: unexpected }, '@/lib/utils': utils,
  })
  for (const is_enquiry of [false, true]) {
    const response = await route.POST(new Request('http://localhost/api/booking', { method: 'POST', body: JSON.stringify({
      product_id: 'classic', start_date: '2027-02-20', end_date: '2027-02-20', contact_name: 'Jane', contact_email: 'jane@example.com', contact_phone: '0400000000', hire_type: 'chauffeured', is_enquiry,
    }) }))
    assert.equal(response.status, 409)
    assert.match((await response.json()).error, /available on enquiry/)
  }
})

test('availability alternatives exclude enquiry-only and public-hidden vehicles in both query branches', async () => {
  for (const blocked of [false, true]) {
    let selected = false
    const route = loadSource('src/app/api/vehicles/available/route.ts', { '@/lib/db': { query: async sql => {
      if (/FROM Vehicle WHERE/.test(sql)) {
        selected = true
        assert.match(sql, /is_available = 1 AND public_bookings_enabled = 1 AND enquiry_only = 0/)
        assert.equal(/id NOT IN/.test(sql), blocked)
      }
      return []
    } } })
    const response = await route.GET({ nextUrl: new URL(`http://localhost/api/vehicles/available?start=2027-02-20&end=2027-02-20${blocked ? '&exclude=classic' : ''}`) })
    assert.equal(response.status, 200)
    assert.equal(selected, true)
  }
})

test('fleet categories validate protected filters, save names/groups, reject duplicates, and delete without deleting vehicles', async () => {
  const writes = []
  let duplicate = false
  const transaction = { queryOne: async sql => /name =/.test(sql) ? duplicate ? { id: 'other' } : null : { id: 'bus' }, execute: async (sql, params) => writes.push({ sql, params }) }
  const categories = loadSource('src/lib/fleet-categories.ts', { './api-route': api, './db': {
    newId: () => 'new', withTransaction: callback => callback(transaction), query: async () => [],
    execute: async (sql, params) => { writes.push({ sql, params }); return { affectedRows: 1 } },
  } })
  for (const name of ['Self-Drive Available', 'All Vehicles', ' ']) assert.throws(() => categories.parseFleetCategory({ name }), api.ApiError)
  assert.equal(categories.parseFleetCategory({ name: 'Chauffeur Only' }).name, 'Chauffeur Only')
  assert.throws(() => categories.parseFleetCategory({ name: 'Bus', homepage_group: 'invalid' }), /homepage group/)
  const input = categories.parseFleetCategory({ name: ' Bus ', homepage_group: 'buses' })
  assert.deepEqual(await categories.saveFleetCategory(input), { id: 'new', name: 'Bus', homepage_group: 'buses' })
  assert.equal((await categories.saveFleetCategory({ ...input, name: 'Minibus' }, 'bus')).name, 'Minibus')
  duplicate = true
  await assert.rejects(categories.saveFleetCategory(input), /already exists/)
  await categories.deleteFleetCategory('bus')
  assert.equal(writes.at(-1).sql, 'DELETE FROM FleetCategory WHERE id = ?')
  assert.deepEqual(writes.at(-1).params, ['bus'])
  assert.ok(writes.every(write => !/DELETE FROM Vehicle\b/.test(write.sql)))
})

test('service buttons have the agreed order and destinations in both homepage layouts and the booking app', () => {
  const expected = ['Self-Drive Buses', 'Chauffeured Hire', 'Special Occasions', 'Taxi']
  assert.deepEqual(serviceButtons.SERVICE_BUTTONS.map(button => button.title), expected)
  const panel = loadSource('src/app/ServicesPanel.tsx', {
    'next/link': { default: link }, '@/lib/service-buttons': serviceButtons,
    '@/components/book/TaxiBookingLink': { default: ({ children }) => React.createElement('button', null, children) },
  }).default
  for (const compact of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(panel, { compact, taxiConfig: {} }))
    assert.deepEqual([...html.matchAll(/<p class="font-display font-bold [^"]*">([^<]+)<\/p>/g)].map(match => match[1]), expected)
    for (const href of ['/vehicles?service=selfdrive', '/vehicles?service=chauffeured', '/special-occasions']) assert.ok(html.includes(`href="${href}"`))
    assert.doesNotMatch(html, /Professional Services|Dry Hire/)
  }
  const picker = loadSource('src/app/book/BookPicker.tsx', {
    react: { ...React, useEffect() {}, useState: initial => [initial === 'splash' ? 'picker' : initial, () => {}] },
    'next/navigation': { useRouter: () => ({ push() {} }) }, '@/lib/service-buttons': serviceButtons,
    '@/components/book/TaxiCallDialog': { default: () => null },
  }).default
  const html = renderToStaticMarkup(React.createElement(picker, { taxiConfig: { onlineBookingEnabled: false } }))
  const positions = expected.map(label => html.indexOf(label))
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])))
  assert.match(html, /Call to book/)
})

test('button categories default to explicit categories and honour custom, empty and deleted assignments without hire-mode guesses', () => {
  const categories = [
    { id: 'bus', name: 'Bus', homepage_group: 'buses' },
    { id: 'executive', name: 'Chauffeured Vehicles', homepage_group: 'chauffeured' },
    { id: 'classic', name: 'Classics', homepage_group: 'special-occasions' },
  ]
  assert.deepEqual(serviceButtons.resolveServiceCategories({}, categories), { selfdrive: 'bus', chauffeured: 'executive' })
  assert.deepEqual(serviceButtons.resolveServiceCategories({}, []), { selfdrive: '', chauffeured: '' })
  const settings = { service_selfdrive_category_id: 'classic', service_chauffeured_category_id: '' }
  assert.deepEqual(serviceButtons.resolveServiceCategories(settings, categories), { selfdrive: 'classic', chauffeured: '' })
  assert.equal(serviceButtons.resolveServiceCategories({ service_selfdrive_category_id: 'deleted' }, categories).selfdrive, 'deleted')
  const vehicles = [vehicle('Assigned', { fleet_categories: [categories[2]], meta: { hire_modes: 'chauffeured_only' } }), vehicle('Unassigned', { meta: { hire_modes: 'both' } })]
  assert.deepEqual(serviceButtons.filterFleetVehicles(vehicles, 'category:classic').map(item => item.id), ['Assigned'])
  assert.deepEqual(serviceButtons.filterFleetVehicles(vehicles, 'category:deleted'), [])
  assert.deepEqual(serviceButtons.filterFleetVehicles(vehicles, 'category:'), [])
  assert.deepEqual(serviceButtons.filterFleetVehicles(vehicles, 'selfdrive').map(item => item.id), ['Unassigned'])
})

test('website and booking-app fleet links use the same Admin category assignments, including legacy links and empty results', async () => {
  const categories = [{ id: 'chosen', name: 'Private Hire', homepage_group: '' }]
  let assignments = { selfdrive: 'chosen', chauffeured: 'chosen' }
  const vehicles = [vehicle('Included', { fleet_categories: categories }), vehicle('Excluded', { meta: { hire_modes: 'both' } })]
  const common = {
    'next/link': { default: link }, '@/lib/service-buttons': serviceButtons, '@/lib/utils': utils,
    '@/lib/api': { getVehicles: async () => vehicles }, '@/lib/fleet-categories': { getFleetCategories: async () => categories },
    '@/lib/service-category-settings': { getServiceCategoryAssignments: async () => assignments },
    '@/components/ui/NavWrapper': { default: () => null }, '@/components/ui/Footer': { default: () => null },
    '@/lib/site': { getSiteName: async () => 'Test', getLogoUrl: async () => '' },
    '@/lib/fleet-collections': collections,
  }
  const card = { default: ({ vehicle }) => React.createElement('p', null, vehicle.name) }
  const grid = loadSource('src/app/vehicles/FleetGrid.tsx', { ...common, '@/components/ui/VehicleCard': card })
  const list = loadSource('src/app/book/hire/MobileVehicleList.tsx', common)
  for (const [file, extra] of [
    ['src/app/vehicles/page.tsx', { './FleetGrid': grid }],
    ['src/app/book/hire/page.tsx', { './MobileVehicleList': list }],
  ]) {
    const page = loadSource(file, { ...common, ...extra }).default
    for (const params of [{ service: 'selfdrive' }, { service: 'chauffeured' }, file.includes('/book/') ? { mode: 'chauffeured' } : { hire: 'chauffeur' }]) {
      assignments = { selfdrive: 'chosen', chauffeured: 'chosen' }
      const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve(params) }))
      assert.match(html, /Included/)
      assert.doesNotMatch(html, /Excluded|<button[^>]*>Chauffeur Only/)
      assignments = { selfdrive: '', chauffeured: 'deleted' }
      const empty = renderToStaticMarkup(await page({ searchParams: Promise.resolve(params) }))
      assert.match(empty, /No vehicles found/)
      assert.doesNotMatch(empty, /Included|Excluded/)
    }
  }
})

test('service category saves validate both selections and persist them atomically in existing Settings', async () => {
  const writes = []
  const transaction = {
    query: async (sql, [ids]) => { assert.match(sql, /FOR UPDATE/); return ids.filter(id => id === 'bus').map(id => ({ id })) },
    execute: async (sql, params) => writes.push({ sql, params }),
  }
  const settings = loadSource('src/lib/service-category-settings.ts', {
    './api-route': api, './service-buttons': serviceButtons,
    './db': { withTransaction: callback => callback(transaction) }, './settings': { getSettings: async () => ({}) },
  })
  for (const body of [{}, { selfdrive: 1, chauffeured: '' }, { selfdrive: 'bus', chauffeured: 'missing' }]) {
    await assert.rejects(settings.saveServiceCategoryAssignments(body), api.ApiError)
  }
  assert.deepEqual(writes, [])
  assert.deepEqual(await settings.saveServiceCategoryAssignments({ selfdrive: 'bus', chauffeured: 'bus' }), { selfdrive: 'bus', chauffeured: 'bus' })
  assert.match(writes[0].sql, /INSERT INTO Setting/)
  assert.deepEqual(writes[0].params, ['service_selfdrive_category_id', 'bus', 'service_chauffeured_category_id', 'bus'])
  await settings.saveServiceCategoryAssignments({ selfdrive: '', chauffeured: '' })
  assert.equal(writes.length, 2)
  const failed = loadSource('src/lib/service-category-settings.ts', {
    './api-route': api, './service-buttons': serviceButtons, './db': {},
    './settings': { getSettings: async () => { throw new Error('Unavailable') } },
  })
  assert.deepEqual(await failed.getServiceCategoryAssignments([{ id: 'bus', name: 'Bus', homepage_group: 'buses' }]), { selfdrive: '', chauffeured: '' })
})

test('service category endpoint requires Admin authentication and bounds its JSON input', async () => {
  let saved = false
  const denied = loadSource('src/lib/api-route.ts', { './auth': { getAdminSession: async () => null } })
  const mocks = { '@/lib/api-route': denied, '@/lib/service-category-settings': { saveServiceCategoryAssignments: async () => { saved = true } } }
  let route = loadSource('src/app/api/admin/service-categories/route.ts', mocks)
  const context = { params: Promise.resolve({}) }
  assert.equal((await route.PUT(new Request('http://localhost/api/admin/service-categories', { method: 'PUT' }), context)).status, 401)
  assert.equal(saved, false)
  route = loadSource('src/app/api/admin/service-categories/route.ts', { ...mocks, '@/lib/api-route': api })
  assert.equal((await route.PUT(new Request('http://localhost/api/admin/service-categories', { method: 'PUT', body: 'x'.repeat(4001) }), context)).status, 413)
  assert.equal(saved, false)
})

test('public vehicle lists show green Self-Drive or Chauffeur Only badges according to hire settings', () => {
  const common = { 'next/link': { default: link }, '@/lib/utils': utils, '@/lib/service-buttons': serviceButtons }
  for (const file of ['src/components/ui/VehicleCard.tsx', 'src/app/book/MobileVehicleList.tsx', 'src/app/book/hire/MobileVehicleList.tsx']) {
    const component = loadSource(file, common).default
    for (const mode of ['both', 'chauffeured_only', undefined]) {
      const selected = vehicle('Car', { price: 100, chauffeur_price: 200, meta: { hire_modes: mode } })
      const html = renderToStaticMarkup(React.createElement(component, { vehicle: selected, vehicles: [selected] }))
      assert.equal(html.includes('Chauffeur Only'), mode !== 'both')
      assert.equal(html.includes('bg-emerald-700'), mode === 'both')
    }
  }
})

test('category administration endpoints reject unauthenticated mutations', async () => {
  const denied = loadSource('src/lib/api-route.ts', { './auth': { getAdminSession: async () => null } })
  const unexpected = () => { throw new Error('Unauthorised category operation') }
  const mocks = { '@/lib/api-route': denied, '@/lib/fleet-categories': { getFleetCategories: unexpected, parseFleetCategory: unexpected, saveFleetCategory: unexpected, deleteFleetCategory: unexpected } }
  const root = loadSource('src/app/api/admin/vehicle-categories/route.ts', mocks)
  const item = loadSource('src/app/api/admin/vehicle-categories/[id]/route.ts', mocks)
  for (const [method, handler] of [['GET', root.GET], ['POST', root.POST], ['PUT', item.PUT], ['DELETE', item.DELETE]]) {
    assert.equal((await handler(new Request('http://localhost/api/admin/vehicle-categories/bus', { method }), { params: Promise.resolve({ id: 'bus' }) })).status, 401)
  }
})

test('desktop occasions expand on mouse entry, and wide touch links require one tap to open then another to navigate', () => {
  let cursor = 0
  const hooks = []
  const react = { ...React,
    useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }] },
    useRef(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index] },
    useEffect() {},
  }
  const Nav = loadSource('src/components/ui/Nav.tsx', { react, 'next/link': { default: link }, 'next/navigation': { usePathname: () => '/' }, '@/lib/utils': utils, '@/lib/special-occasions': occasions }).default
  function render() { cursor = 0; return Nav({}) }
  function find(element, predicate) {
    if (!element || typeof element !== 'object') return null
    if (predicate(element)) return element
    for (const child of React.Children.toArray(element.props?.children)) { const match = find(child, predicate); if (match) return match }
    return null
  }
  const title = tree => find(tree, node => node.props?.['aria-controls'] === 'occasions-links' && node.props?.href)
  let tree = render()
  const menu = find(tree, node => typeof node.props?.onPointerEnter === 'function')
  menu.props.onPointerEnter({ pointerType: 'mouse' })
  assert.equal(title(render()).props['aria-expanded'], true)
  hooks.length = 0
  tree = render()
  let prevented = 0
  title(tree).props.onPointerDown({ pointerType: 'touch' })
  title(tree).props.onClick({ detail: 1, preventDefault() { prevented++ } })
  assert.equal(prevented, 1)
  tree = render()
  assert.equal(title(tree).props['aria-expanded'], true)
  title(tree).props.onClick({ detail: 1, preventDefault() { prevented++ } })
  assert.equal(prevented, 1)
  tree = render()
  assert.equal(title(tree).props['aria-expanded'], false)
  title(tree).props.onClick({ detail: 0, preventDefault() { prevented++ } })
  assert.equal(prevented, 1, 'keyboard activation still follows the title link')
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

test('production signing fails closed for missing or known development secrets', async () => {
  const previousMode = process.env.NODE_ENV
  const previousSecrets = ['ADMIN_JWT_SECRET', 'VENDOR_JWT_SECRET', 'DRIVER_JWT_SECRET'].map(key => [key, process.env[key]])
  process.env.NODE_ENV = 'production'
  for (const [key] of previousSecrets) delete process.env[key]
  try {
    const codec = loadSource('src/lib/signed-token.ts')
    const admin = loadSource('src/lib/auth.ts', { 'next/headers': {}, './signed-token': codec })
    const vendor = loadSource('src/lib/vendor-auth.ts', { 'next/headers': {}, './signed-token': codec })
    const driver = loadSource('src/lib/driver-auth.ts', { 'next/headers': {}, './signed-token': codec })
    await assert.rejects(admin.createToken('admin'), /private portal signing secret/)
    await assert.rejects(vendor.createVendorToken('id', 'Vendor'), /private portal signing secret/)
    await assert.rejects(driver.createDriverToken('id', 'Driver'), /private portal signing secret/)
    for (const secret of ['dev-secret', 'vendor-dev-secret', 'driver-dev-secret']) {
      await assert.rejects(codec.createSignedToken({ username: 'admin' }, secret, 1000), /private portal signing secret/)
    }
    assert.equal(await admin.verifyToken('fake.signature'), null)
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousMode
    for (const [key, value] of previousSecrets) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
