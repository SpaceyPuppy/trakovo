import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

const APP_ROOT = process.cwd()
export const NEXT_DIR = path.join(APP_ROOT, '.next')
export const BACKUP_DIR = path.join(APP_ROOT, '.next.backup')

export interface UpdateResult {
  buildId: string
}

/**
 * Apply a .next bundle zip to the server.
 * - Extracts to a temp dir first and validates BUILD_ID
 * - Backs up current .next to .next.backup before swapping
 * - Auto-restores backup on any failure
 * - Fixes permissions and touches tmp/restart.txt to restart Passenger
 */
export async function applyUpdate(zipPath: string): Promise<UpdateResult> {
  const timestamp = Date.now()
  const extractDir = path.join(os.tmpdir(), `trakovo-extract-${timestamp}`)

  fs.mkdirSync(extractDir, { recursive: true })

  try {
    // Extract zip to temp — do not touch production files yet.
    // Try unzip first, then python3, then python as fallbacks.
    let extracted = false
    try {
      execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'pipe' })
      extracted = true
    } catch { /* try next method */ }

    if (!extracted) {
      for (const py of ['python3', 'python']) {
        try {
          execSync(
            `${py} -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipPath}" "${extractDir}"`,
            { stdio: 'pipe' }
          )
          extracted = true
          break
        } catch { /* try next */ }
      }
    }

    if (!extracted) {
      throw new Error('Could not extract zip — unzip and python3 are both unavailable on this server.')
    }

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
