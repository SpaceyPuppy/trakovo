import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clientId = process.env.GC_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: 'GC_CLIENT_ID must be set' }, { status: 500 })
  }

  // Derive redirect URI from the request origin so it works on both
  // localhost (dev) and the live domain without any config change.
  const origin = new URL(req.url).origin

  const state = crypto.randomUUID()
  await prisma.setting.upsert({
    where: { key: 'gc_oauth_state' },
    create: { key: 'gc_oauth_state', value: state },
    update: { value: state },
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/admin/settings/gc-callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events openid email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
