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
    console.error('[ms-callback] OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${origin}/admin/settings?error=oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/admin/settings?error=invalid_callback`)
  }

  // Verify state to prevent CSRF
  const storedState = await prisma.setting.findUnique({ where: { key: 'ms_oauth_state' } })
  if (!storedState || storedState.value !== state) {
    return NextResponse.redirect(`${origin}/admin/settings?error=state_mismatch`)
  }

  const clientId = process.env.MS_CLIENT_ID!
  const clientSecret = process.env.MS_CLIENT_SECRET!
  const tenantId = process.env.MS_TENANT_ID!
  const redirectUri = `${origin}/api/admin/settings/ms-callback`

  // Exchange code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        scope: 'Mail.Send User.Read offline_access',
      }),
    }
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[ms-callback] Token exchange failed:', err)
    return NextResponse.redirect(`${origin}/admin/settings?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokens

  // Fetch connected user's email
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const me = meRes.ok ? await meRes.json() : {}
  const connectedEmail = (me.mail ?? me.userPrincipalName ?? '').toLowerCase()

  const expiryIso = new Date(Date.now() + expires_in * 1000).toISOString()

  // Save tokens and clear state
  await Promise.all([
    prisma.setting.upsert({ where: { key: 'ms_access_token' }, create: { key: 'ms_access_token', value: access_token }, update: { value: access_token } }),
    prisma.setting.upsert({ where: { key: 'ms_refresh_token' }, create: { key: 'ms_refresh_token', value: refresh_token }, update: { value: refresh_token } }),
    prisma.setting.upsert({ where: { key: 'ms_token_expiry' }, create: { key: 'ms_token_expiry', value: expiryIso }, update: { value: expiryIso } }),
    prisma.setting.upsert({ where: { key: 'ms_connected_email' }, create: { key: 'ms_connected_email', value: connectedEmail }, update: { value: connectedEmail } }),
    prisma.setting.delete({ where: { key: 'ms_oauth_state' } }).catch(() => null),
  ])

  return NextResponse.redirect(`${origin}/admin/settings?ms=connected`)
}
