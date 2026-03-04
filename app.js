// cPanel Passenger entry point for Next.js
// This file is required by Phusion Passenger to start the app.
// Do not rename — cPanel expects 'app.js' as the startup file.

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
