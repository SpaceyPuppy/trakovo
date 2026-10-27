import { getSettings, upsertSettings } from './settings'
import { microsoftRequest } from './microsoft-http'
import { MICROSOFT_SCOPE, parseMicrosoftTokens } from './microsoft-oauth'
import { microsoftDiagnosticCode, microsoftProviderCode } from './microsoft-errors'

const TOKEN_KEYS = ['ms_access_token', 'ms_token_expiry', 'ms_refresh_token'] as const
const REFRESH_BUFFER_MS = 5 * 60 * 1000

let refreshInFlight: Promise<string | null> | null = null

function parseExpiry(value: string | undefined): number {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.MS_CLIENT_ID
  const clientSecret = process.env.MS_CLIENT_SECRET
  const tenantId = process.env.MS_TENANT_ID ?? 'common'
  if (!clientId || !clientSecret) return null

  try {
    const response = await microsoftRequest(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          scope: MICROSOFT_SCOPE,
        }),
      }
    )
    if (!response.ok) {
      console.error('[microsoft-token] Refresh rejected', { status: response.status, code: microsoftProviderCode(await response.json().catch(() => null)) })
      return null
    }

    const token = parseMicrosoftTokens(await response.json(), refreshToken)
    if (!token) return null
    // Do not restore a connection that was disconnected/replaced during the request.
    const current = await getSettings(TOKEN_KEYS)
    if (current.ms_refresh_token !== refreshToken || !current.ms_access_token) return null

    const updates: Array<readonly [string, string]> = [
      ['ms_access_token', token.access_token],
      ['ms_token_expiry', new Date(Date.now() + token.expires_in * 1000).toISOString()],
    ]
    if (token.refresh_token) updates.push(['ms_refresh_token', token.refresh_token])
    await upsertSettings(updates)
    return token.access_token
  } catch (error) {
    console.error('[microsoft-token] Refresh request failed', { code: microsoftDiagnosticCode(error) })
    return null
  }
}

/** Return a usable Graph token while coalescing concurrent refresh requests. */
export async function getMicrosoftAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string | null> {
  const settings = await getSettings(TOKEN_KEYS)
  const accessToken = settings.ms_access_token
  const refreshToken = settings.ms_refresh_token
  if (!accessToken || !refreshToken) return null

  if (!options.forceRefresh && Date.now() < parseExpiry(settings.ms_token_expiry) - REFRESH_BUFFER_MS) {
    return accessToken
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(refreshToken).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/** Retry only a rejected authentication attempt, never an ambiguous mail/event timeout. */
export async function microsoftGraphRequest(url: string, options: Parameters<typeof microsoftRequest>[1], token: string) {
  const send = (accessToken: string) => microsoftRequest(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${accessToken}` } })
  const response = await send(token)
  if (response.status !== 401) return response
  const refreshed = await getMicrosoftAccessToken({ forceRefresh: true })
  return refreshed ? send(refreshed) : response
}
