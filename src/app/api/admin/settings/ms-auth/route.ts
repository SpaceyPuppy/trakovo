import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clientId = process.env.MS_CLIENT_ID
  const tenantId = process.env.MS_TENANT_ID

  if (!clientId || !tenantId) {
    return NextResponse.json({ error: 'MS_CLIENT_ID and MS_TENANT_ID must be set' }, { status: 500 })
  }

  // Read site_url from DB (most reliable on cPanel/Passenger where env vars may not propagate)
  const siteUrlRow = await import('@/lib/db').then(m => m.queryOne<{ value: string }>(
    "SELECT value FROM Setting WHERE `key` = 'site_url' LIMIT 1"
  ))
  const origin = (siteUrlRow?.value || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  const redirectUri = `${origin}/api/admin/settings/ms-callback`

  // Generate and store state for CSRF protection
  const state = crypto.randomUUID()
  await execute(
    'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
    ['ms_oauth_state', state]
  )

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'Mail.Send User.Read Calendars.ReadWrite offline_access',
    response_mode: 'query',
    state,
  })

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
  )
}
