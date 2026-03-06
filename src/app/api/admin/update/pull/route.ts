import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { applyUpdate } from '@/lib/next-update'
import fs from 'fs'
import path from 'path'
import os from 'os'

const GITHUB_REPO = 'SpaceyPuppy/trakovo'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assetId, assetName } = await req.json()
  if (!assetId || !assetName) {
    return NextResponse.json({ error: 'Missing assetId or assetName' }, { status: 400 })
  }

  const zipPath = path.join(os.tmpdir(), `trakovo-pull-${Date.now()}.zip`)

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    // Download via GitHub API (works for both public and private repos)
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/assets/${assetId}`,
      { headers, redirect: 'follow' }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub returned ${res.status} downloading asset` },
        { status: 502 }
      )
    }

    // Stream to disk
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(zipPath, buffer)

    const result = await applyUpdate(zipPath)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Pull failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ }
  }
}
