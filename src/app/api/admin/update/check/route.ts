import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import { getLatestGitHubRelease, GitHubTransportError } from '@/lib/github-http'

export const runtime = 'nodejs'
const BUNDLE_ASSET_PREFIX = 'next-bundle-'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.TRAKOVO_CONTAINER === 'true') {
    return NextResponse.json({ error: 'Container deployments must be upgraded from the VPS.' }, { status: 409 })
  }

  // Read current installed version from package.json on disk.
  // The bundle swap also replaces package.json, so this stays current.
  let currentVersion = 'unknown'
  let currentBuildLabel = 'unknown'
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
    currentVersion = pkg.version ?? 'unknown'
    currentBuildLabel = pkg.build_label ?? currentVersion
  } catch { /* ignore */ }

  try {
    const release = await getLatestGitHubRelease()
    const tag: string = release.tag_name ?? ''         // e.g. "v1.3.1"
    const latestVersion = tag.replace(/^v/, '')        // e.g. "1.3.1"
    const releaseName: string = release.name ?? tag
    const releaseUrl: string = release.html_url ?? ''
    const publishedAt: string = release.published_at ?? ''

    // Find the next-bundle asset
    const asset = (release.assets as Array<{ id: number; name: string; size: number; browser_download_url: string }>)
      ?.find((a) => a.name.startsWith(BUNDLE_ASSET_PREFIX) && a.name.endsWith('.zip'))

    return NextResponse.json({
      currentVersion,
      currentBuildLabel,
      latestVersion,
      tag,
      releaseName,
      releaseUrl,
      publishedAt,
      upToDate: currentVersion === latestVersion,
      asset: asset
        ? { id: asset.id, name: asset.name, size: asset.size, url: asset.browser_download_url }
        : null,
    })
  } catch (err: unknown) {
    const msg = err instanceof GitHubTransportError ? err.message : 'Failed to check for updates. Try Manual Deploy.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
