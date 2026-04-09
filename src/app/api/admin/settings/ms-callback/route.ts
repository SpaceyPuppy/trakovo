import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Read site_url from DB (most reliable on cPanel/Passenger where env vars may not propagate)
  const siteUrlRow = await queryOne<{ value: string }>(
    "SELECT value FROM Setting WHERE `key` = 'site_url' LIMIT 1"
  )
  const origin = (siteUrlRow?.value || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

  if (error) {
    console.error('[ms-callback] OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${origin}/admin/settings?error=oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/admin/settings?error=invalid_callback`)
  }

  // Verify state to prevent CSRF
  const storedState = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['ms_oauth_state'])
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
        scope: 'Mail.Send User.Read Calendars.ReadWrite offline_access',
      }),
    }
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[ms-callback] Token exchange failed:', err)
    let errCode = 'token_exchange_failed'
    try { const j = JSON.parse(err); errCode = j.error_description ?? j.error ?? errCode } catch { /* ignore */ }
    return NextResponse.redirect(`${origin}/admin/settings?error=${encodeURIComponent(errCode)}`)
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

  const upsert = (key: string, value: string) =>
    execute('INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()', [key, value])

  // Save tokens and clear state
  await Promise.all([
    upsert('ms_access_token', access_token),
    upsert('ms_refresh_token', refresh_token),
    upsert('ms_token_expiry', expiryIso),
    upsert('ms_connected_email', connectedEmail),
    execute('DELETE FROM Setting WHERE `key` = ?', ['ms_oauth_state']).catch(() => null),
  ])

  return NextResponse.redirect(`${origin}/admin/settings?ms=connected`)
}
