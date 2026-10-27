import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'
import { getSettings, upsertSettings } from '@/lib/settings'
import { microsoftRequest, MicrosoftTransportError } from '@/lib/microsoft-http'
import { microsoftDiagnosticCode, microsoftProviderCode } from '@/lib/microsoft-errors'
import { MICROSOFT_SCOPE, MICROSOFT_CALLBACK_PATH, microsoftOAuthConfig, microsoftSiteOrigin, parseMicrosoftTokens } from '@/lib/microsoft-oauth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  let origin = new URL(req.url).origin
  let stage = 'settings'
  const redirect = (error: string) => {
    const target = new URL('/admin/settings/connections', origin)
    target.searchParams.set('error', error)
    return NextResponse.redirect(target)
  }
  try {
    const session = await getAdminSession()
    if (!session) return redirect('ms_session_expired')
    const settings = await getSettings(['site_url', 'ms_oauth_state', 'ms_oauth_redirect_uri', 'ms_oauth_created_at', 'ms_oauth_admin', 'ms_connected_email'])
    stage = 'configuration'
    origin = microsoftSiteOrigin(settings.site_url, req.url)
    const config = microsoftOAuthConfig(settings.site_url, req.url)
    if (params.has('error')) return redirect('oauth_denied')
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) return redirect('invalid_callback')
    const createdAt = Number(settings.ms_oauth_created_at)
    if (state !== settings.ms_oauth_state || settings.ms_oauth_admin !== session.username
      || !Number.isFinite(createdAt) || createdAt > Date.now() || Date.now() - createdAt > 10 * 60_000) return redirect('state_mismatch')
    const redirectUri = settings.ms_oauth_redirect_uri
    if (!redirectUri || new URL(redirectUri).pathname !== MICROSOFT_CALLBACK_PATH) return redirect('state_mismatch')

    stage = 'storage'
    // Consume the nonce before exchanging this one-use authorization code.
    await execute('DELETE FROM Setting WHERE `key` = ? AND value = ?', ['ms_oauth_state', state])
    stage = 'token'
    const response = await microsoftRequest(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId,
        client_secret: config.clientSecret, code, redirect_uri: redirectUri, scope: MICROSOFT_SCOPE }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      console.error('[ms-callback] Token exchange rejected', { status: response.status, code: microsoftProviderCode(data) })
      return redirect('ms_token_rejected')
    }
    const tokens = parseMicrosoftTokens(await response.json())
    if (!tokens) return redirect('ms_invalid_response')
    stage = 'profile'
    const profile = await microsoftRequest('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profile.ok) {
      console.error('[ms-callback] Mailbox lookup rejected', { status: profile.status })
      return redirect('ms_profile')
    }
    const user = await profile.json<{ mail?: string; userPrincipalName?: string }>()
    const email = (user.mail || user.userPrincipalName || '').trim().toLowerCase()
    if (!email) return redirect('ms_profile')
    stage = 'storage'
    const updates: Array<[string, string]> = [
      ['ms_access_token', tokens.access_token], ['ms_refresh_token', tokens.refresh_token],
      ['ms_token_expiry', new Date(Date.now() + tokens.expires_in * 1000).toISOString()],
      ['ms_connected_email', email],
    ]
    // Calendar IDs belong to a mailbox. A different account must choose its calendar again.
    if (settings.ms_connected_email !== email) updates.push(['ms_calendar_id', ''], ['ms_calendar_name', ''])
    await upsertSettings(updates)
    const target = new URL('/admin/settings/connections', origin)
    target.searchParams.set('ms', 'connected')
    return NextResponse.redirect(target)
  } catch (error) {
    console.error('[ms-callback] Connection failed', { stage, code: microsoftDiagnosticCode(error) })
    return redirect(error instanceof MicrosoftTransportError ? 'ms_network'
      : stage === 'configuration' ? 'ms_configuration' : stage === 'profile' ? 'ms_profile'
      : stage === 'token' ? 'ms_invalid_response' : 'ms_storage')
  }
}
