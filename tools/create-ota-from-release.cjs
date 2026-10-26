// Add an OTA asset to an existing release without rebuilding or retagging it.
// Usage: node tools/create-ota-from-release.cjs baseline.zip release.zip output.zip
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const AdmZip = require('adm-zip')

function readArchive(filename) {
  const files = new Map()
  for (const entry of new AdmZip(filename).getEntries()) {
    if (entry.isDirectory) continue
    const name = entry.entryName.replaceAll('\\', '/')
    assert.ok(!name.startsWith('/') && !name.split('/').some(part => part === '..' || part === '.' || !part), 'Unsafe release entry')
    assert.ok(!files.has(name), 'Duplicate release entry')
    assert.notEqual((entry.attr >>> 16) & 0o170000, 0o120000, 'Release contains a symbolic link')
    files.set(name, entry)
  }
  return files
}

function json(files, name) {
  assert.ok(files.has(name), `Missing ${name}`)
  return JSON.parse(files.get(name).getData().toString('utf8'))
}

function normaliseLock(lock) {
  const result = structuredClone(lock)
  delete result.version
  if (result.packages?.['']) delete result.packages[''].version
  return result
}

function createOta(baselinePath, releasePath, outputPath, policy = require('../package.json')) {
  assert.ok(!policy.deployment.requires_full_install, 'Release policy requires a full installation')
  assert.ok(!fs.existsSync(outputPath), 'Output already exists; do not replace published assets blindly')
  const baseline = readArchive(baselinePath)
  const release = readArchive(releasePath)
  const baseManifest = json(baseline, 'package.json')
  const manifest = json(release, 'package.json')
  assert.equal(manifest.version, policy.version, 'Release version does not match the reviewed policy')
  assert.equal(baseManifest.version, policy.deployment.minimum_ota_version, 'Baseline does not match the required OTA version')
  for (const key of ['name', 'dependencies', 'devDependencies', 'overrides', 'engines', 'scripts']) {
    assert.deepEqual(manifest[key], baseManifest[key], `${key} changed: use a full installation`)
  }
  assert.deepEqual(normaliseLock(json(release, 'package-lock.json')), normaliseLock(json(baseline, 'package-lock.json')), 'Dependency lock changed: use a full installation')
  const externalFiles = files => [...files.keys()].filter(name => ['app.js', 'next.config.js', '.cpanel.yml'].includes(name) || name.startsWith('public/')).sort()
  assert.deepEqual(externalFiles(release), externalFiles(baseline), 'Runtime files outside .next changed')
  for (const name of externalFiles(release)) assert.ok(release.get(name).getData().equals(baseline.get(name).getData()), `${name} changed: use a full installation`)
  for (const sql of policy.deployment.required_sql ?? []) assert.ok(release.has(sql), `Missing SQL prerequisite ${sql}`)
  assert.ok(release.has('.next/BUILD_ID'), 'Release has no compiled build')

  const ota = new AdmZip()
  for (const [name, entry] of release) {
    if (!name.startsWith('.next/')) continue
    assert.ok(!/^\.next\/(standalone|cache|dev)(\/|$)/.test(name) && !/(^|\/)\.env($|\.)/.test(name), 'Unsafe build file')
    ota.addFile(name, entry.getData())
  }
  manifest.deployment = { ...policy.deployment }
  ota.addFile('package.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'))
  const bytes = ota.toBuffer()
  fs.writeFileSync(path.resolve(outputPath), bytes, { flag: 'wx' })
  return { version: manifest.version, minimumVersion: baseManifest.version, buildId: release.get('.next/BUILD_ID').getData().toString('utf8').trim(), bytes: bytes.length, entries: ota.getEntries().length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  assert.equal(args.length, 3, 'Provide baseline ZIP, release ZIP and output ZIP')
  console.log(JSON.stringify(createOta(...args)))
}
module.exports = { createOta }
