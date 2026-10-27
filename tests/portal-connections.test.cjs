const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { EventEmitter } = require('node:events')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, mocks = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: file,
  }).outputText
  const result = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), result, result.exports, ...Object.values(globals))
  return result.exports
}
const oauth = load('src/lib/microsoft-oauth.ts')
const errors = load('src/lib/microsoft-errors.ts')
const httpModule = load('src/lib/microsoft-http.ts')
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data, text: async () => JSON.stringify(data) })
const link = ({ children, ...props }) => React.createElement('a', props, children)

test('OTA uses native HTTPS for metadata and redirected private assets without forwarding credentials', async t => {
  const prior = process.env.GITHUB_TOKEN
  process.env.GITHUB_TOKEN = 'private-test-token'
  t.after(() => prior === undefined ? delete process.env.GITHUB_TOKEN : process.env.GITHUB_TOKEN = prior)
  const calls = []
  let redirect = 'https://release-assets.githubusercontent.com/release.zip?signature=private'
  let mode = 'normal'
  let deadline
  const github = load('src/lib/github-http.ts', { 'node:https': { request(url, options, callback) {
    const outgoing = new EventEmitter()
    outgoing.destroy = () => {}
    outgoing.end = () => queueMicrotask(() => {
      calls.push({ url: url.toString(), options })
      if (mode === 'timeout') return deadline()
      if (mode === 'network') return outgoing.emit('error', Object.assign(new Error('private signed URL'), { code: 'ENOTFOUND' }))
      const incoming = new EventEmitter()
      incoming.resume = () => {}
      incoming.headers = {}
      incoming.statusCode = mode === 'http' ? 403 : 200
      if (url.pathname.endsWith('/assets/123')) { incoming.statusCode = 302; incoming.headers.location = redirect }
      callback(incoming)
      if (mode === 'size') incoming.emit('data', Buffer.alloc(2 * 1024 * 1024 + 1))
      else incoming.emit('data', url.pathname.endsWith('/latest') ? Buffer.from('{"tag_name":"v1.20.2","assets":[]}') : Buffer.from('zip-bytes'))
      incoming.emit('end')
    })
    return outgoing
  } } }, { setTimeout: fn => { deadline = fn; return 1 }, clearTimeout() {} })
  assert.equal((await github.getLatestGitHubRelease()).tag_name, 'v1.20.2')
  assert.equal((await github.downloadGitHubAsset(123)).toString(), 'zip-bytes')
  assert.equal(calls[1].options.headers.Authorization, 'Bearer private-test-token')
  assert.equal(calls[2].options.headers.Authorization, undefined)
  assert.notEqual(calls[2].options.rejectUnauthorized, false)
  for (redirect of ['http://release-assets.githubusercontent.com/a', 'https://evil.example/a', 'https://api.github.com:8443/a', 'https://user:secret@api.github.com/a']) {
    await assert.rejects(github.downloadGitHubAsset(123), /INVALID_DESTINATION/)
  }
  for (mode of ['size', 'timeout', 'network', 'http']) {
    await assert.rejects(github.getLatestGitHubRelease(), error => {
      assert.doesNotMatch(error.message, /private signed URL|signature=|private-test-token/)
      return error.code === { size: 'RESPONSE_TOO_LARGE', timeout: 'REQUEST_TIMEOUT', network: 'ENOTFOUND', http: 'HTTP_403' }[mode]
    })
  }
  await assert.rejects(github.downloadGitHubAsset('../123'), /INVALID_ASSET/)
})

function configure(t) {
  for (const [key, value] of Object.entries({ MS_CLIENT_ID: 'test-client', MS_CLIENT_SECRET: 'test-secret-value', MS_TENANT_ID: 'test-tenant', NEXT_PUBLIC_SITE_URL: 'https://fleet.example' })) {
    const previous = process.env[key]
    process.env[key] = value
    t.after(() => previous === undefined ? delete process.env[key] : process.env[key] = previous)
  }
}

test('Microsoft HTTPS uses native requests without fetch, preserves form encoding and rejects unsafe destinations', async t => {
  const original = global.fetch
  global.fetch = () => { throw new Error('fetch/WASM must not be used') }
  t.after(() => { global.fetch = original })
  const calls = []
  const http = load('src/lib/microsoft-http.ts', { 'node:https': { request: (url, options, callback) => {
    const outgoing = new EventEmitter()
    outgoing.destroy = () => {}
    outgoing.end = body => {
      calls.push({ url: url.toString(), options, body })
      queueMicrotask(() => {
        const incoming = new EventEmitter()
        incoming.statusCode = 200
        callback(incoming)
        incoming.emit('data', Buffer.from('{"ok":true}'))
        incoming.emit('end')
      })
    }
    return outgoing
  } } })
  const res = await http.microsoftRequest('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST', body: new URLSearchParams({ client_secret: 'a+b&c' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(calls[0].body, 'client_secret=a%2Bb%26c')
  assert.equal(calls[0].options.headers['Content-Length'], String(Buffer.byteLength(calls[0].body)))
  assert.notEqual(calls[0].options.rejectUnauthorized, false)
  for (const url of ['http://graph.microsoft.com/', 'https://evil.example/', 'https://user:secret@graph.microsoft.com/', 'https://graph.microsoft.com:8443/']) await assert.rejects(http.microsoftRequest(url), /INVALID_DESTINATION/)
  assert.equal(calls.length, 1)
})

test('Microsoft HTTPS bounds response size and duration and sanitises network failures', async () => {
  for (const kind of ['size', 'timeout', 'network']) {
    let timer
    let request
    const http = load('src/lib/microsoft-http.ts', { 'node:https': { request: (_url, _options, callback) => {
      request = new EventEmitter()
      request.destroy = () => {}
      request.end = () => queueMicrotask(() => {
        if (kind === 'timeout') return timer()
        if (kind === 'network') return request.emit('error', Object.assign(new Error('secret request payload'), { code: 'ENOTFOUND' }))
        const incoming = new EventEmitter()
        incoming.statusCode = 200
        callback(incoming)
        incoming.emit('data', Buffer.alloc(2 * 1024 * 1024 + 1))
      })
      return request
    } } }, { setTimeout: fn => { timer = fn; return 1 }, clearTimeout() {} })
    await assert.rejects(http.microsoftRequest('https://graph.microsoft.com/v1.0/me'), error => {
      assert.doesNotMatch(error.message, /secret request payload/)
      return error.code === { size: 'RESPONSE_TOO_LARGE', timeout: 'REQUEST_TIMEOUT', network: 'ENOTFOUND' }[kind]
    })
  }
})

function connectionFixture(t) {
  configure(t)
  const store = { site_url: 'https://fleet.example' }
  const writes = []
  const logs = []
  const originalLog = console.error
  console.error = (...args) => logs.push(args)
  t.after(() => { console.error = originalLog })
  let session = { username: 'admin' }
  let request = async url => url.includes('/token') ? response(200, { access_token: 'access-value', refresh_token: 'refresh-value', expires_in: 3600 })
    : response(200, { mail: 'mailbox@example.com' })
  let saveFailure = false
  const settings = {
    getSettings: async keys => Object.fromEntries(keys.filter(key => store[key] !== undefined).map(key => [key, store[key]])),
    upsertSettings: async entries => {
      if (saveFailure) throw Object.assign(new Error('SQL with secret tokens'), { code: 'ER_DATA_TOO_LONG' })
      writes.push(entries); for (const [key, value] of entries) store[key] = value
    },
  }
  const mocks = {
    '@/lib/auth': { getAdminSession: async () => session }, '@/lib/settings': settings,
    '@/lib/db': { execute: async (_sql, [_key, state]) => { if (store.ms_oauth_state === state) delete store.ms_oauth_state } },
    '@/lib/microsoft-oauth': oauth, '@/lib/microsoft-errors': errors,
    '@/lib/microsoft-http': { ...httpModule, microsoftRequest: (...args) => request(...args) },
  }
  const start = load('src/app/api/admin/settings/ms-auth/route.ts', mocks).GET
  const finish = load('src/app/api/admin/settings/ms-callback/route.ts', mocks).GET
  return { store, writes, logs, settings, mocks, start, finish,
    setSession: value => { session = value }, setRequest: value => { request = value }, failSave: () => { saveFailure = true },
    callback: () => new Request(`https://fleet.example/api/admin/settings/ms-callback?code=private-authorization-code&state=${store.ms_oauth_state}`),
  }
}

test('Microsoft sign-in binds an expiring state and exact redirect URI, stores a complete connection, and prevents replay', async t => {
  const fixture = connectionFixture(t)
  const started = await fixture.start(new Request('https://internal-host/api/admin/settings/ms-auth'))
  const login = new URL(started.headers.get('location'))
  assert.equal(login.searchParams.get('redirect_uri'), 'https://fleet.example/api/admin/settings/ms-callback')
  assert.equal(login.searchParams.get('scope'), oauth.MICROSOFT_SCOPE)
  assert.equal(login.searchParams.get('state'), fixture.store.ms_oauth_state)
  let calls = 0
  fixture.setRequest(async (url, options) => {
    calls++
    if (url.includes('/token')) {
      assert.equal(options.body.get('redirect_uri'), login.searchParams.get('redirect_uri'))
      return response(200, { access_token: 'access-value', refresh_token: 'refresh-value', expires_in: 3600 })
    }
    return response(200, { userPrincipalName: 'MAILBOX@example.com' })
  })
  const callback = fixture.callback()
  const finished = await fixture.finish(callback)
  assert.equal(finished.status, 307)
  assert.equal(new URL(finished.headers.get('location')).pathname, '/admin/settings/connections')
  assert.equal(new URL(finished.headers.get('location')).searchParams.get('ms'), 'connected')
  assert.equal(fixture.store.ms_connected_email, 'mailbox@example.com')
  assert.equal(fixture.store.ms_refresh_token, 'refresh-value')
  assert.equal(fixture.store.ms_calendar_id, '')
  assert.equal(fixture.store.ms_oauth_state, undefined)
  assert.equal(fixture.writes.length, 2)
  assert.equal(new URL((await fixture.finish(callback)).headers.get('location')).searchParams.get('error'), 'state_mismatch')
  assert.equal(calls, 2)
})

test('callback failures return actionable settings redirects without leaking codes, tokens or provider descriptions', async t => {
  const cases = [
    ['state_mismatch', f => { f.store.ms_oauth_created_at = '1' }],
    ['state_mismatch', f => { f.store.ms_oauth_admin = 'other-admin' }],
    ['ms_session_expired', f => f.setSession(null)],
    ['ms_configuration', () => { delete process.env.MS_CLIENT_SECRET }],
    ['ms_token_rejected', f => f.setRequest(async () => response(400, { error: 'invalid_client', error_codes: [7000215], error_description: 'secret-provider-description' }))],
    ['ms_network', f => f.setRequest(async () => { throw new httpModule.MicrosoftTransportError('ENOTFOUND') })],
    ['ms_invalid_response', f => f.setRequest(async () => response(200, { access_token: 'access-value', expires_in: 'bad' }))],
    ['ms_profile', f => f.setRequest(async url => url.includes('/token') ? response(200, { access_token: 'access-value', refresh_token: 'refresh-value', expires_in: 3600 }) : response(403, {}))],
    ['ms_storage', f => f.failSave()],
  ]
  for (const [expected, change] of cases) {
    await t.test(expected, async child => {
      const f = connectionFixture(child)
      await f.start(new Request('https://fleet.example/api/admin/settings/ms-auth'))
      const callback = f.callback()
      change(f)
      const res = await f.finish(callback)
      assert.equal(res.status, 307)
      assert.equal(new URL(res.headers.get('location')).searchParams.get('error'), expected)
      assert.equal(f.store.ms_access_token, undefined)
      assert.doesNotMatch(JSON.stringify(f.logs) + res.headers.get('location'), /private-authorization-code|test-secret-value|access-value|refresh-value|secret-provider-description|SQL with secret/)
    })
  }
})

test('token parsing rejects incomplete/invalid responses and friendly errors do not echo arbitrary provider text', () => {
  for (const data of [null, {}, { access_token: 'a', refresh_token: 'b', expires_in: -1 }, { access_token: 'a', refresh_token: 'b', expires_in: 1e20 }]) assert.equal(oauth.parseMicrosoftTokens(data), null)
  assert.equal(oauth.parseMicrosoftTokens({ access_token: 'a', expires_in: 3600 }, 'old-refresh').refresh_token, 'old-refresh')
  assert.doesNotMatch(errors.microsoftConnectionMessage('private-authorization-code'), /private-authorization-code/)
})

test('token refresh is coalesced, rotates tokens and does not restore a disconnected connection', async t => {
  configure(t)
  let store = { ms_access_token: 'expired', ms_refresh_token: 'refresh-old', ms_token_expiry: '2000-01-01' }
  let resolveRequest
  let requests = 0
  const settings = { getSettings: async () => ({ ...store }), upsertSettings: async entries => { for (const [key, value] of entries) store[key] = value } }
  const token = load('src/lib/microsoft-token.ts', { './settings': settings, './microsoft-oauth': oauth, './microsoft-errors': errors,
    './microsoft-http': { microsoftRequest: async () => { requests++; return new Promise(resolve => { resolveRequest = resolve }) } },
  })
  const first = token.getMicrosoftAccessToken()
  const second = token.getMicrosoftAccessToken()
  await new Promise(resolve => setImmediate(resolve))
  resolveRequest(response(200, { access_token: 'fresh', refresh_token: 'refresh-new', expires_in: 3600 }))
  assert.deepEqual(await Promise.all([first, second]), ['fresh', 'fresh'])
  assert.equal(requests, 1)
  assert.equal(store.ms_refresh_token, 'refresh-new')
  store.ms_token_expiry = '2000-01-01'
  const third = token.getMicrosoftAccessToken()
  await new Promise(resolve => setImmediate(resolve))
  store = {}
  resolveRequest(response(200, { access_token: 'late', expires_in: 3600 }))
  assert.equal(await third, null)
  assert.deepEqual(store, {})
})

test('Graph refreshes once on HTTP 401 but never retries failed or ambiguous delivery', async t => {
  configure(t)
  let calls = []
  let store = { ms_access_token: 'old', ms_refresh_token: 'refresh', ms_token_expiry: new Date(Date.now() + 3600000).toISOString() }
  const token = load('src/lib/microsoft-token.ts', { './microsoft-oauth': oauth, './microsoft-errors': errors,
    './settings': { getSettings: async () => ({ ...store }), upsertSettings: async entries => { for (const [key, value] of entries) store[key] = value } },
    './microsoft-http': { microsoftRequest: async (url, options) => {
      calls.push({ url, options })
      return url.includes('/token') ? response(200, { access_token: 'fresh', expires_in: 3600 }) : response(options.headers.Authorization === 'Bearer fresh' ? 202 : 401, {})
    } },
  })
  assert.equal((await token.microsoftGraphRequest('https://graph.microsoft.com/v1.0/me/sendMail', { method: 'POST', body: '{}' }, 'old')).status, 202)
  assert.equal(calls.length, 3)
  assert.equal(calls.filter(call => call.url.includes('/token')).length, 1)
  calls = []
  const network = load('src/lib/microsoft-token.ts', { './microsoft-oauth': oauth, './microsoft-errors': errors,
    './settings': { getSettings: async () => store }, './microsoft-http': { microsoftRequest: async () => { calls.push(1); throw new Error('timeout') } },
  })
  await assert.rejects(network.microsoftGraphRequest('https://graph.microsoft.com/v1.0/me/sendMail', {}, 'old'), /timeout/)
  assert.equal(calls.length, 1)
})

test('calendar access failures are explicit and require authentication rather than returning a successful empty list', async () => {
  let authenticated = false
  let token = null
  const route = load('src/app/api/admin/settings/ms-calendars/route.ts', {
    '@/lib/auth': { getAdminSession: async () => authenticated ? {} : null }, '@/lib/microsoft-errors': errors,
    '@/lib/microsoft-token': { getMicrosoftAccessToken: async () => token, microsoftGraphRequest: async () => response(403, {}) },
  })
  assert.equal((await route.GET()).status, 401)
  authenticated = true
  assert.equal((await route.GET()).status, 401)
  token = 'connected-token'
  assert.equal((await route.GET()).status, 502)
})

test('notification mail uses the Microsoft request path and does not fall back after ambiguous Graph failure', async () => {
  let calls = 0
  let fail = false
  let available = true
  const email = load('src/lib/email.ts', {
    nodemailer: { default: { createTransport: () => { throw new Error('No duplicate SMTP delivery') } } },
    './db': { queryOne: async () => null }, './site': { getSiteName: async () => 'Test' }, './email-templates': {},
    './microsoft-token': {
      getMicrosoftAccessToken: async () => available ? 'usable-token' : null,
      microsoftGraphRequest: async (url, options, token) => {
        calls++
        assert.equal(url, 'https://graph.microsoft.com/v1.0/me/sendMail')
        assert.equal(token, 'usable-token')
        assert.equal(JSON.parse(options.body).message.toRecipients[0].emailAddress.address, 'test@example.com')
        if (fail) throw new Error('Ambiguous timeout')
        return response(202, {})
      },
    },
  })
  await email.sendEmail('test@example.com', 'Test', '<p>Test</p>')
  fail = true
  await assert.rejects(email.sendEmail('test@example.com', 'Test', '<p>Test</p>'), /Ambiguous timeout/)
  assert.equal(calls, 2)
  available = false
  await assert.rejects(email.sendTestEmail('test@example.com', 'microsoft'), /Microsoft access is not available/)
  assert.equal(calls, 2)
})

test('Microsoft calendar create, update, stale-event recovery and delete use the shared transport and persist event IDs', async () => {
  const calls = []
  const writes = []
  const booking = { id: 'booking', public_id: 'VHB-TEST', status: 'confirmed', hire_type: 'chauffeured', start_date: '2027-01-10', end_date: '2027-01-10', total_days: 1, total_cost: 10000, vehicle_name: 'Test car', ms_event_id: null }
  let stale = false
  const calendar = load('src/lib/calendar.ts', {
    './db': { queryOne: async sql => /FROM Setting/.test(sql) ? { value: 'cal+id/' } : /SELECT ms_event_id/.test(sql) ? { ms_event_id: booking.ms_event_id } : booking,
      execute: async (sql, params) => { writes.push({ sql, params }); booking.ms_event_id = /SET ms_event_id = NULL/.test(sql) ? null : params[0] },
    },
    './site': { getSiteName: async () => 'Test' }, './microsoft-errors': errors,
    './microsoft-token': { getMicrosoftAccessToken: async () => 'token', microsoftGraphRequest: async (url, options) => {
      calls.push({ url, options })
      return options.method === 'POST' ? response(201, { id: 'event+id/' }) : response(stale && options.method === 'PATCH' ? 404 : 204, {})
    } },
  })
  await calendar.syncBookingToCalendar('booking')
  assert.equal(booking.ms_event_id, 'event+id/')
  assert.match(calls[0].url, /calendars\/cal%2Bid%2F\/events$/)
  await calendar.syncBookingToCalendar('booking')
  assert.equal(calls[1].options.method, 'PATCH')
  assert.match(calls[1].url, /events\/event%2Bid%2F$/)
  stale = true
  await calendar.syncBookingToCalendar('booking')
  assert.deepEqual(calls.slice(2).map(call => call.options.method), ['PATCH', 'POST'])
  await calendar.deleteCalendarEvent('booking')
  assert.equal(calls.at(-1).options.method, 'DELETE')
  assert.equal(writes.length, 3)
})

function hooks() {
  let cursor = 0
  const values = []
  return { react: { ...React, useEffect() {}, useId: () => 'account-options', useRef: value => ({ current: value }),
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next }] },
  }, render(component, props) { cursor = 0; return component(props) } }
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of React.Children.toArray(node.props?.children)) { const result = find(child, predicate); if (result) return result }
  return null
}

test('mobile avatar opens the same account actions as desktop and sign-out handles both success and failure', async t => {
  const original = global.fetch
  t.after(() => { global.fetch = original })
  for (const compact of [true, false]) for (const success of [true, false]) {
    const state = hooks()
    const navigations = []
    let opened = false
    global.fetch = async url => { assert.equal(url, '/api/admin/logout'); return { ok: success } }
    const component = load('src/app/admin/AdminAccountMenu.tsx', {
      react: state.react, 'next/link': { default: link }, '@/components/ui/PortalIcon': { default: () => null },
      'next/navigation': { useRouter: () => ({ replace: url => navigations.push(url), refresh: () => navigations.push('refresh') }) },
    }).default
    const props = { username: 'Test Admin', compact, onOpen: () => { opened = true } }
    let tree = state.render(component, props)
    find(tree, node => node.props?.['aria-label'] === 'Account menu').props.onClick()
    tree = state.render(component, props)
    assert.equal(opened, true)
    const html = renderToStaticMarkup(tree)
    assert.match(html, /Profile settings/)
    assert.match(html, /Sign out/)
    assert.doesNotMatch(html, /Open menu/)
    await find(tree, node => node.type === 'button' && node.props?.children?.at?.(-1) === 'Sign out').props.onClick()
    if (success) assert.deepEqual(navigations, ['/admin/login', 'refresh'])
    else { assert.deepEqual(navigations, []); assert.match(renderToStaticMarkup(state.render(component, props)), /Unable to sign out/) }
  }
})
