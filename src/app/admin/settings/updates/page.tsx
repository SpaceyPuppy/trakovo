import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import UpdatesCard from './UpdatesCard'

export const metadata: Metadata = { title: 'Updates' }
export const revalidate = 0

export default function UpdatesPage() {
  const APP_ROOT = process.cwd()

  let currentBuildId: string | null = null
  try {
    currentBuildId = fs.readFileSync(path.join(APP_ROOT, '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch { /* build not found */ }

  const hasBackup = fs.existsSync(path.join(APP_ROOT, '.next.backup'))

  let backupBuildId: string | null = null
  if (hasBackup) {
    try {
      backupBuildId = fs.readFileSync(path.join(APP_ROOT, '.next.backup', 'BUILD_ID'), 'utf-8').trim()
    } catch { /* ignore */ }
  }

  // Read version/label from package.json — the bundle swap also updates this file
  let version = 'unknown'
  let buildLabel = 'unknown'
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf-8'))
    version = pkg.version ?? 'unknown'
    buildLabel = pkg.build_label ?? version
  } catch { /* ignore */ }

  return (
    <UpdatesCard
      version={version}
      buildLabel={buildLabel}
      currentBuildId={currentBuildId}
      hasBackup={hasBackup}
      backupBuildId={backupBuildId}
    />
  )
}
