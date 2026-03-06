import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { applyUpdate } from '@/lib/next-update'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('bundle') as File | null
  if (!file) return NextResponse.json({ error: 'No bundle file uploaded' }, { status: 400 })

  const zipPath = path.join(os.tmpdir(), `trakovo-upload-${Date.now()}.zip`)
  try {
    fs.writeFileSync(zipPath, Buffer.from(await file.arrayBuffer()))
    const result = await applyUpdate(zipPath)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ }
  }
}
