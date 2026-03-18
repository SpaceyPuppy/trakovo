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

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const fd = await req.formData()
    const file = fd.get('hero') as File | null
    if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Use PNG, JPG, or WebP.' }, { status: 400 })

    const ext = path.extname(file.name).toLowerCase() || '.jpg'
    const filename = `hero${ext}`
    const heroDir = path.join(getUploadDir(), 'hero')
    await fs.mkdir(heroDir, { recursive: true })

    const existing = await fs.readdir(heroDir).catch(() => [] as string[])
    await Promise.all(existing.map(f => fs.unlink(path.join(heroDir, f)).catch(() => {})))

    await fs.writeFile(path.join(heroDir, filename), Buffer.from(await file.arrayBuffer()))
    const heroPath = `hero/${filename}`

    await execute(
      'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
      ['hero_image_path', heroPath]
    )

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const setting = await queryOne<{ value: string }>(
      "SELECT value FROM Setting WHERE `key` = 'hero_image_path' LIMIT 1"
    )
    if (setting?.value) {
      await fs.unlink(path.join(getUploadDir(), setting.value)).catch(() => {})
    }
    await execute("DELETE FROM Setting WHERE `key` = 'hero_image_path'").catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
