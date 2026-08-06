import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const APP_ROOT = process.cwd()
const NEXT_DIR = path.join(APP_ROOT, '.next')
const BACKUP_DIR = path.join(APP_ROOT, '.next.backup')

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.TRAKOVO_CONTAINER === 'true') {
    return NextResponse.json({ error: 'Container deployments must be upgraded from the VPS.' }, { status: 409 })
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    return NextResponse.json({ error: 'No backup found to roll back to' }, { status: 404 })
  }

  // Verify the backup contains a valid BUILD_ID before swapping
  const backupBuildId = path.join(BACKUP_DIR, 'BUILD_ID')
  if (!fs.existsSync(backupBuildId)) {
    return NextResponse.json({ error: 'Backup is corrupt (no BUILD_ID)' }, { status: 500 })
  }

  const buildId = fs.readFileSync(backupBuildId, 'utf-8').trim()

  // Remove current .next and restore backup
  try {
    if (fs.existsSync(NEXT_DIR)) {
      fs.rmSync(NEXT_DIR, { recursive: true, force: true })
    }
    fs.renameSync(BACKUP_DIR, NEXT_DIR)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Rollback failed'
    return NextResponse.json({ error: msg }, { status: 500 })
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

  return NextResponse.json({ ok: true, buildId })
}
