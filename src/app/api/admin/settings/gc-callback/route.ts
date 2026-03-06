import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'

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

  const storedState = await queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ? LIMIT 1', ['gc_oauth_state'])
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

  const upsert = (key: string, value: string) =>
    execute('INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()', [key, value])

  await Promise.all([
    upsert('gc_access_token', access_token),
    upsert('gc_refresh_token', refresh_token),
    upsert('gc_token_expiry', expiryIso),
    upsert('gc_connected_email', connectedEmail),
    execute('DELETE FROM Setting WHERE `key` = ?', ['gc_oauth_state']).catch(() => null),
  ])

  return NextResponse.redirect(`${origin}/admin/settings?gc=connected`)
}
