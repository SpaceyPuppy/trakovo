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
    // Extract zip to temp — do not touch production files yet
    try {
      execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'pipe' })
    } catch {
      throw new Error('Failed to extract zip. Ensure unzip is installed on the server.')
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

    // Remove any existing backup, then back up current .next
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true })
    }
    if (fs.existsSync(NEXT_DIR)) {
      fs.renameSync(NEXT_DIR, BACKUP_DIR)
    }

    // Move new .next into place
    try {
      fs.renameSync(candidateNext, NEXT_DIR)
    } catch {
      // Cross-device rename — fall back to cp
      try {
        execSync(`cp -r "${candidateNext}" "${NEXT_DIR}"`, { stdio: 'pipe' })
      } catch {
        // Restore backup and bail
        if (fs.existsSync(BACKUP_DIR)) {
          try { fs.renameSync(BACKUP_DIR, NEXT_DIR) } catch { /* best effort */ }
        }
        throw new Error('Failed to move new build into place. Previous build restored.')
      }
    }

    // Fix permissions
    try {
      execSync(`find "${NEXT_DIR}" -type d -exec chmod 755 {} \\;`, { stdio: 'pipe' })
      execSync(`find "${NEXT_DIR}" -type f -exec chmod 644 {} \\;`, { stdio: 'pipe' })
    } catch { /* non-fatal */ }

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
