import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getSettings, upsertSettings } from '@/lib/settings'
import { MICROSOFT_SCOPE, microsoftOAuthConfig, microsoftSiteOrigin } from '@/lib/microsoft-oauth'
import { microsoftDiagnosticCode } from '@/lib/microsoft-errors'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let origin = new URL(req.url).origin
  let stage = 'settings'
  try {
    const settings = await getSettings(['site_url'])
    stage = 'configuration'
    origin = microsoftSiteOrigin(settings.site_url, req.url)
    const config = microsoftOAuthConfig(settings.site_url, req.url)
    const state = crypto.randomUUID()
    stage = 'storage'
    await upsertSettings([
      ['ms_oauth_state', state], ['ms_oauth_redirect_uri', config.redirectUri],
      ['ms_oauth_created_at', String(Date.now())], ['ms_oauth_admin', session.username],
    ])
    const params = new URLSearchParams({ client_id: config.clientId, response_type: 'code',
      redirect_uri: config.redirectUri, scope: MICROSOFT_SCOPE, response_mode: 'query', state })
    return NextResponse.redirect(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize?${params}`)
  } catch (error) {
    console.error('[ms-auth] Connection start failed', { stage, code: microsoftDiagnosticCode(error) })
    const target = new URL('/admin/settings/connections', origin)
    target.searchParams.set('error', stage === 'configuration' ? 'ms_configuration' : 'ms_storage')
    return NextResponse.redirect(target)
  }
}
