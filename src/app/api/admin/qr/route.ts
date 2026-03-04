import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import QRCode from 'qrcode'

export async function GET(_req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''
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
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 })
  }
}
