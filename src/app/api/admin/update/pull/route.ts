import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { applyUpdate } from '@/lib/next-update'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { downloadGitHubAsset } from '@/lib/github-http'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.TRAKOVO_CONTAINER === 'true') {
    return NextResponse.json({ error: 'Container deployments must be upgraded from the VPS.' }, { status: 409 })
  }

  const body = await req.json().catch(() => null)
  const assetId = body?.assetId
  const assetName = body?.assetName
  if (!Number.isSafeInteger(assetId) || assetId <= 0 || typeof assetName !== 'string' || !/^next-bundle-v[0-9]+\.[0-9]+\.[0-9]+\.zip$/.test(assetName)) {
    return NextResponse.json({ error: 'Select a valid next-bundle release asset' }, { status: 400 })
  }

  const zipPath = path.join(os.tmpdir(), `trakovo-pull-${Date.now()}.zip`)

  try {
    const buffer = await downloadGitHubAsset(assetId)
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
