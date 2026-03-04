import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { resolveUploadPath } from '@/lib/uploads'
import fs from 'fs/promises'
import path from 'path'

interface Context { params: { path: string[] } }

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const relativePath = params.path.join('/')
  const { fullPath, uploadDir } = resolveUploadPath(relativePath)

  // Path traversal guard
  if (!fullPath.startsWith(uploadDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buf = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
