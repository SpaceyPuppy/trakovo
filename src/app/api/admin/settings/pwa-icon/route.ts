import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), 'uploads')
}

// No SVG — PWA icons must be raster images
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const fd = await req.formData()
    const file = fd.get('pwa_icon') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, or WebP (no SVG).' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase() || '.png'
    const filename = `pwa-icon${ext}`
    const iconDir = path.join(getUploadDir(), 'pwa-icon')
    await fs.mkdir(iconDir, { recursive: true })

    // Remove any existing icon files
    const existing = await fs.readdir(iconDir).catch(() => [] as string[])
    await Promise.all(
      existing.map((f) => fs.unlink(path.join(iconDir, f)).catch(() => {}))
    )

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(iconDir, filename), buffer)

    const iconPath = `pwa-icon/${filename}`

    await execute(
      'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
      ['pwa_icon_path', iconPath]
    )

    return NextResponse.json({ ok: true, pwa_icon_path: iconPath })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const setting = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['pwa_icon_path'])
    if (setting?.value) {
      const fullPath = path.join(getUploadDir(), setting.value)
      await fs.unlink(fullPath).catch(() => {})
    }

    await execute('DELETE FROM Setting WHERE `key` = ?', ['pwa_icon_path']).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
