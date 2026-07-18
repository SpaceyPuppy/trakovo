import { getSettings, upsertSettings } from './settings'

const TOKEN_KEYS = ['ms_access_token', 'ms_token_expiry', 'ms_refresh_token'] as const
const REFRESH_BUFFER_MS = 5 * 60 * 1000
const GRAPH_SCOPE = 'Mail.Send User.Read Calendars.ReadWrite offline_access'

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

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
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          scope: GRAPH_SCOPE,
        }),
      }
    )
    if (!response.ok) {
      console.error('[microsoft-token] Refresh failed with status', response.status)
      return null
    }

    const token = await response.json() as TokenResponse
    if (!token.access_token || !Number.isFinite(token.expires_in)) return null

    const updates: Array<readonly [string, string]> = [
      ['ms_access_token', token.access_token],
      ['ms_token_expiry', new Date(Date.now() + token.expires_in * 1000).toISOString()],
    ]
    if (token.refresh_token) updates.push(['ms_refresh_token', token.refresh_token])
    await upsertSettings(updates)
    return token.access_token
  } catch (error) {
    console.error('[microsoft-token] Refresh request failed', error)
    return null
  }
}

/** Return a usable Graph token while coalescing concurrent refresh requests. */
export async function getMicrosoftAccessToken(): Promise<string | null> {
  const settings = await getSettings(TOKEN_KEYS)
  const accessToken = settings.ms_access_token
  const refreshToken = settings.ms_refresh_token
  if (!accessToken || !refreshToken) return null

  if (Date.now() < parseExpiry(settings.ms_token_expiry) - REFRESH_BUFFER_MS) {
    return accessToken
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(refreshToken).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}
