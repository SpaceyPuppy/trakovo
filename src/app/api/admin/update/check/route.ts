import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const GITHUB_REPO = 'SpaceyPuppy/trakovo'
const BUNDLE_ASSET_PREFIX = 'next-bundle-'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers })
    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `GitHub API returned ${res.status}: ${body}` },
        { status: 502 }
      )
    }

    const release = await res.json()
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
    const msg = err instanceof Error ? err.message : 'Failed to check for updates'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
