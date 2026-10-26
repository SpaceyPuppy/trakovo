const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const AdmZip = require('adm-zip')

const filename = path.join(__dirname, '../src/lib/next-update.ts')
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
const loaded = { exports: {} }
new Function('require', 'module', 'exports', source)(require, loaded, loaded.exports)
const { validateUpdateArchive } = loaded.exports

function bundle(metadata = {}) {
  const archive = new AdmZip()
  archive.addFile('.next/BUILD_ID', Buffer.from('build-id'))
  archive.addFile('.next/server/app/page.js', Buffer.from('compiled'))
  archive.addFile('package.json', Buffer.from(JSON.stringify(metadata)))
  return archive
}

test('ordinary OTA bundles remain valid, but a full-package release is rejected before extraction', () => {
  assert.doesNotThrow(() => validateUpdateArchive(bundle({ version: '1.20.0' })))
  assert.throws(() => validateUpdateArchive(bundle({ deployment: { requires_full_install: true } })), /full-package installation/)
})

test('OTA archive rejects unexpected files, secrets, links, duplicate paths and excessive expanded sizes', () => {
  for (const name of ['app.js', '.next/server/.env', '.next/standalone/server.js', '.next/cache/data', '.next/dev/server.js']) {
    const archive = bundle()
    archive.addFile(name, Buffer.from('unexpected'))
    assert.throws(() => validateUpdateArchive(archive), /Invalid OTA archive/)
  }
  const entry = (name, size = 1, attr = 0) => ({ entryName: name, header: { size }, attr })
  for (const entries of [
    [entry('../escape')], [entry('.next/../escape')], [entry('.next/a'), entry('.next/a')],
    [entry('.next/a'), entry('.next\\a')], [entry('.next/a', 1, 0o120777 << 16)],
    [entry('.next/huge', 129 * 1024 * 1024)], Array.from({ length: 9 }, (_, index) => entry(`.next/${index}`, 128 * 1024 * 1024)),
  ]) assert.throws(() => validateUpdateArchive({ getEntries: () => entries, getEntry: () => null }))
})
