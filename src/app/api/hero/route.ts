import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), 'uploads')
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET() {
  try {
    const setting = await queryOne<{ value: string }>(
      "SELECT value FROM Setting WHERE `key` = 'hero_image_path' LIMIT 1"
    )
    if (!setting?.value) return new NextResponse(null, { status: 404 })

    const fullPath = path.join(getUploadDir(), setting.value)
    const buf = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'image/jpeg'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
