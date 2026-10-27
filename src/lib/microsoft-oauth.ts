export const MICROSOFT_SCOPE = 'Mail.Send User.Read Calendars.ReadWrite offline_access'
export const MICROSOFT_CALLBACK_PATH = '/api/admin/settings/ms-callback'

export function microsoftSiteOrigin(siteUrl: string | undefined, requestUrl: string): string {
  const url = new URL(siteUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestUrl)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid website Site URL')
  return url.origin
}

export function microsoftOAuthConfig(siteUrl: string | undefined, requestUrl: string) {
  const clientId = process.env.MS_CLIENT_ID?.trim()
  const clientSecret = process.env.MS_CLIENT_SECRET?.trim()
  const tenantId = process.env.MS_TENANT_ID?.trim()
  if (!clientId || !clientSecret || !tenantId || !/^[a-zA-Z0-9.-]+$/.test(tenantId)) throw new Error('Microsoft environment configuration is incomplete')
  const origin = microsoftSiteOrigin(siteUrl, requestUrl)
  return { clientId, clientSecret, tenantId, origin, redirectUri: `${origin}${MICROSOFT_CALLBACK_PATH}` }
}

export interface MicrosoftTokens { access_token: string; refresh_token: string; expires_in: number }

export function parseMicrosoftTokens(value: unknown, previousRefresh?: string): MicrosoftTokens | null {
  if (!value || typeof value !== 'object') return null
  const token = value as Partial<MicrosoftTokens>
  const refresh = token.refresh_token ?? previousRefresh
  if (typeof token.access_token !== 'string' || !token.access_token || typeof refresh !== 'string' || !refresh
    || !Number.isSafeInteger(token.expires_in) || token.expires_in! <= 0 || token.expires_in! > 31_536_000) return null
  return { access_token: token.access_token, refresh_token: refresh, expires_in: token.expires_in! }
}
