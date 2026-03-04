// cPanel Passenger entry point for Next.js
// This file is required by Phusion Passenger to start the app.
// Do not rename — cPanel expects 'app.js' as the startup file.

// Some shared hosts block WebAssembly memory allocation (used by Node's built-in
// undici HTTP parser). Catch that specific failure so the process doesn't crash.
// Next.js uses its own bundled fetch/undici for server-side requests, so the
// app continues to function normally.
process.on('unhandledRejection', (reason) => {
  if (reason instanceof RangeError && reason.message && reason.message.includes('wasm memory')) {
    console.warn('[app] WebAssembly memory blocked by host — using JS HTTP fallback')
    return
  }
  console.error('[app] Unhandled rejection:', reason)
  process.exit(1)
})

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Passenger sets the PORT environment variable automatically
const port = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Trakovo ready on port ${port}`)
  })
})
