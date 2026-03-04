import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Use the request origin so this works on both localhost and production.
  const origin = new URL(req.url).origin

  if (error) {
    console.error('[gc-callback] OAuth error:', error)
    return NextResponse.redirect(`${origin}/admin/settings?error=gc_oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/admin/settings?error=gc_invalid_callback`)
  }

  const storedState = await prisma.setting.findUnique({ where: { key: 'gc_oauth_state' } })
  if (!storedState || storedState.value !== state) {
    return NextResponse.redirect(`${origin}/admin/settings?error=gc_state_mismatch`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GC_CLIENT_ID!,
      client_secret: process.env.GC_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/admin/settings/gc-callback`,
      code,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[gc-callback] Token exchange failed:', err)
    return NextResponse.redirect(`${origin}/admin/settings?error=gc_token_failed`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokens

  // Fetch user email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const user = userRes.ok ? await userRes.json() : {}
  const connectedEmail = (user.email ?? '').toLowerCase()
  const expiryIso = new Date(Date.now() + expires_in * 1000).toISOString()

  await Promise.all([
    prisma.setting.upsert({ where: { key: 'gc_access_token' }, create: { key: 'gc_access_token', value: access_token }, update: { value: access_token } }),
    prisma.setting.upsert({ where: { key: 'gc_refresh_token' }, create: { key: 'gc_refresh_token', value: refresh_token }, update: { value: refresh_token } }),
    prisma.setting.upsert({ where: { key: 'gc_token_expiry' }, create: { key: 'gc_token_expiry', value: expiryIso }, update: { value: expiryIso } }),
    prisma.setting.upsert({ where: { key: 'gc_connected_email' }, create: { key: 'gc_connected_email', value: connectedEmail }, update: { value: connectedEmail } }),
    prisma.setting.delete({ where: { key: 'gc_oauth_state' } }).catch(() => null),
  ])

  return NextResponse.redirect(`${origin}/admin/settings?gc=connected`)
}
