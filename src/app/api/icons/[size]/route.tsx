import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSiteName } from '@/lib/site'
import fs from 'fs/promises'
import path from 'path'

const ALLOWED_SIZES = new Set([180, 192, 512])

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), 'uploads')
}

async function getImageDataUrl(dbKey: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM Setting WHERE `key` = ? LIMIT 1',
    [dbKey]
  )
  if (!row?.value) return null

  const fullPath = path.join(getUploadDir(), row.value)
  try {
    const buf = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size, 10)
  if (!ALLOWED_SIZES.has(size)) {
    return new Response('Not found', { status: 404 })
  }

  // Priority: PWA icon → site logo → first letter fallback
  const imageUrl = await getImageDataUrl('pwa_icon_path') ?? await getImageDataUrl('logo_path')

  const imgSize = Math.round(size * 0.6)

  let content: JSX.Element

  if (imageUrl) {
    content = (
      <div
        style={{
          width: size,
          height: size,
          background: '#1e2330',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          width={imgSize}
          height={imgSize}
          style={{ objectFit: 'contain' }}
        />
      </div>
    )
  } else {
    // Fallback: first letter of site name
    const siteName = await getSiteName()
    const letter = (siteName?.trim()[0] ?? 'T').toUpperCase()
    const fontSize = Math.round(size * 0.5)

    content = (
      <div
        style={{
          width: size,
          height: size,
          background: '#1e2330',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          {letter}
        </span>
      </div>
    )
  }

  const response = new ImageResponse(content, { width: size, height: size })

  return new Response(response.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
