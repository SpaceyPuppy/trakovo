import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

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
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
}

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'logo_path' } })
    if (!setting?.value) {
      return new NextResponse(null, { status: 404 })
    }

    const fullPath = path.join(getUploadDir(), setting.value)
    const buf = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'image/png'

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
