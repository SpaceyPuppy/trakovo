import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import AdmZip from 'adm-zip'

const APP_ROOT = process.cwd()
export const NEXT_DIR = path.join(APP_ROOT, '.next')
export const BACKUP_DIR = path.join(APP_ROOT, '.next.backup')

export interface UpdateResult {
  buildId: string
}

/** Reject unsafe/oversized archives and full installations before extracting anything. */
export function validateUpdateArchive(archive: AdmZip): void {
  const entries = archive.getEntries()
  if (entries.length > 50000) throw new Error('Update archive contains too many entries')
  const names = new Set<string>()
  let totalSize = 0
  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, '/')
    const segments = name.replace(/\/$/, '').split('/')
    if (names.has(name) || segments.some(segment => !segment || segment === '.' || segment === '..') ||
        /[\x00:]/.test(name) || (name !== 'package.json' && name !== '.next/' && !name.startsWith('.next/')) ||
        /(^|\/)\.env($|\.)/.test(name) || /^\.next\/(standalone|cache|dev)(\/|$)/.test(name) ||
        ((entry.attr >>> 16) & 0o170000) === 0o120000) {
      throw new Error('Invalid OTA archive: use a next-bundle package; full packages must be installed through cPanel')
    }
    names.add(name)
    const size = entry.header.size
    if (!Number.isSafeInteger(size) || size < 0 || size > 128 * 1024 * 1024) throw new Error('Update archive entry is too large')
    totalSize += size
    if (totalSize > 1024 * 1024 * 1024) throw new Error('Update archive is too large')
  }
  const manifest = archive.getEntry('package.json')
  if (manifest) {
    if (manifest.header.size > 128 * 1024) throw new Error('Invalid update manifest')
    const metadata = JSON.parse(manifest.getData().toString('utf8'))
    if (metadata.deployment?.requires_full_install) throw new Error('This release requires full-package installation through cPanel. Follow PENDING-DEPLOY.md.')
  }
}

/**
 * Apply a .next bundle zip to the server.
 * - Extracts to a temp dir first and validates BUILD_ID
 * - Backs up current .next to .next.backup before swapping
 * - Auto-restores backup on any failure
 * - Fixes permissions and touches tmp/restart.txt to restart Passenger
 */
export async function applyUpdate(zipPath: string): Promise<UpdateResult> {
  const archive = new AdmZip(zipPath)
  validateUpdateArchive(archive)
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trakovo-extract-'))

  try {
    // Extract zip using adm-zip (pure JS — no system binaries required)
    archive.extractAllTo(extractDir, true)

    // Zip must contain a .next folder with BUILD_ID
    const candidateNext = path.join(extractDir, '.next')
    const buildIdPath = path.join(candidateNext, 'BUILD_ID')
    if (!fs.existsSync(buildIdPath)) {
      throw new Error(
        'Invalid bundle: .next/BUILD_ID not found. Zip the .next folder itself (not its contents).'
      )
    }
    const newBuildId = fs.readFileSync(buildIdPath, 'utf-8').trim()

    // Copy package.json from bundle if present — keeps on-disk version in sync
    const bundlePackageJson = path.join(extractDir, 'package.json')
    if (fs.existsSync(bundlePackageJson)) {
      fs.copyFileSync(bundlePackageJson, path.join(APP_ROOT, 'package.json'))
    }

    // Remove any existing backup, then back up current .next
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true })
    }
    if (fs.existsSync(NEXT_DIR)) {
      fs.renameSync(NEXT_DIR, BACKUP_DIR)
    }

    // Fix permissions before moving — ensures production never sees bad permissions
    try {
      execSync(`find "${candidateNext}" -type d -exec chmod 755 {} +`, { stdio: 'pipe' })
      execSync(`find "${candidateNext}" -type f -exec chmod 644 {} +`, { stdio: 'pipe' })
    } catch { /* non-fatal */ }

    // Move new .next into place (mv handles cross-device moves automatically)
    try {
      execSync(`mv "${candidateNext}" "${NEXT_DIR}"`, { stdio: 'pipe' })
    } catch {
      // Restore backup and bail
      if (fs.existsSync(BACKUP_DIR)) {
        try { fs.renameSync(BACKUP_DIR, NEXT_DIR) } catch { /* best effort */ }
      }
      throw new Error('Failed to move new build into place. Previous build restored.')
    }

    // Restart Passenger
    const tmpDir = path.join(APP_ROOT, 'tmp')
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'restart.txt'), '')

    return { buildId: newBuildId }
  } catch (err) {
    // Unexpected error — restore backup if .next is missing
    if (!fs.existsSync(NEXT_DIR) && fs.existsSync(BACKUP_DIR)) {
      try { fs.renameSync(BACKUP_DIR, NEXT_DIR) } catch { /* best effort */ }
    }
    throw err
  } finally {
    try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}
