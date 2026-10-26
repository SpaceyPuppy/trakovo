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

test('existing-release OTA uses identical compiled bytes and refuses dependency or root-file changes', () => {
  const os = require('node:os')
  const { createOta } = require('../tools/create-ota-from-release.cjs')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trakovo-ota-test-'))
  try {
    const policy = { version: '1.20.0', deployment: { requires_full_install: false, minimum_ota_version: '1.19.0', required_sql: ['database/change.sql'] } }
    function release(version, { dependency = '16.4.3', startup = 'startup' } = {}) {
      const archive = new AdmZip()
      archive.addFile('package.json', Buffer.from(JSON.stringify({ version, dependencies: { next: dependency }, deployment: { requires_full_install: true } })))
      archive.addFile('package-lock.json', Buffer.from(JSON.stringify({ version, packages: { '': { version, dependencies: { next: dependency } } } })))
      archive.addFile('app.js', Buffer.from(startup))
      archive.addFile('next.config.js', Buffer.from('config'))
      archive.addFile('public/icon.svg', Buffer.from('<svg/>'))
      archive.addFile('database/change.sql', Buffer.from('ALTER TABLE Vehicle ADD COLUMN enquiry_only BOOLEAN DEFAULT false;'))
      archive.addFile('.next/BUILD_ID', Buffer.from(`build-${version}`))
      archive.addFile('.next/server/app/page.js', Buffer.from(`compiled-${version}`))
      return archive
    }
    const baseline = path.join(root, 'baseline.zip')
    const target = path.join(root, 'release.zip')
    const output = path.join(root, 'ota.zip')
    release('1.19.0').writeZip(baseline)
    release('1.20.0').writeZip(target)
    const result = createOta(baseline, target, output, policy)
    assert.equal(result.minimumVersion, '1.19.0')
    const ota = new AdmZip(output)
    assert.doesNotThrow(() => validateUpdateArchive(ota))
    assert.equal(ota.readAsText('.next/server/app/page.js'), 'compiled-1.20.0')
    assert.equal(ota.readAsText('.next/BUILD_ID'), 'build-1.20.0')
    assert.deepEqual(JSON.parse(ota.readAsText('package.json')).deployment, policy.deployment)
    assert.ok(ota.getEntries().every(entry => !entry.entryName.includes('\\') && (entry.entryName.startsWith('.next/') || entry.entryName === 'package.json')))
    assert.throws(() => createOta(baseline, target, output, policy), /already exists/)
    for (const changes of [{ dependency: '17.0.0' }, { startup: 'changed startup' }]) {
      release('1.20.0', changes).writeZip(target)
      assert.throws(() => createOta(baseline, target, path.join(root, 'refused.zip'), policy), /changed/)
      assert.equal(fs.existsSync(path.join(root, 'refused.zip')), false)
    }
  } finally {
    const resolved = fs.realpathSync(root)
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()))
    assert.ok(path.basename(resolved).startsWith('trakovo-ota-test-'))
    fs.rmSync(resolved, { recursive: true, force: true })
  }
})
