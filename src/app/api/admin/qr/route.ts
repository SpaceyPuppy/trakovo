import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import QRCode from 'qrcode'

export async function GET(_req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const row = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['site_url'])
  const siteUrl = row?.value?.trim().replace(/\/$/, '') ?? ''
  const bookingUrl = `${siteUrl}/book`

  try {
    const svg = await QRCode.toString(bookingUrl, {
      type: 'svg',
      width: 220,
      margin: 2,
      color: { dark: '#141414', light: '#ffffff' },
    })
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 })
  }
}
