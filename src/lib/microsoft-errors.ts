const messages: Record<string, string> = {
  oauth_denied: 'Microsoft sign-in was cancelled or consent was denied. Try connecting again.',
  invalid_callback: 'The Microsoft sign-in response was incomplete. Start a new connection from this page.',
  state_mismatch: 'This Microsoft sign-in has expired or was replaced. Start a new connection from this page.',
  ms_session_expired: 'Your admin session expired. Sign in to Admin and connect Microsoft again.',
  ms_configuration: 'Check MS_CLIENT_ID, MS_CLIENT_SECRET and MS_TENANT_ID in cPanel, and the website Site URL in General settings.',
  ms_network: 'The server could not reach Microsoft. Check host outbound HTTPS, DNS and TLS access, then reconnect.',
  ms_token_rejected: 'Microsoft rejected the connection. Check the client secret VALUE, its expiry, tenant and registered Web redirect URI, then reconnect.',
  ms_profile: 'Microsoft could not verify the connected mailbox. Check User.Read consent and reconnect.',
  ms_storage: 'The server could not save Microsoft connection settings. Check the application database error log and Setting.value column.',
  ms_invalid_response: 'Microsoft returned an incomplete token response. Start a new connection.',
}

export function microsoftConnectionMessage(code: string | null): string {
  return code ? messages[code] ?? 'Microsoft connection failed. Start a new connection and check the server log if it persists.' : ''
}

/** Codes only: do not log OAuth payloads, tokens, request URLs or provider descriptions. */
export function microsoftDiagnosticCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code
  return typeof code === 'string' && /^[A-Z0-9_]{1,50}$/.test(code) ? code : 'UNEXPECTED_ERROR'
}

export function microsoftProviderCode(data: unknown): string {
  if (!data || typeof data !== 'object') return 'PROVIDER_ERROR'
  const value = data as { error?: unknown; error_codes?: unknown }
  if (Array.isArray(value.error_codes) && Number.isSafeInteger(value.error_codes[0]) && value.error_codes[0] > 0) return `AADSTS${value.error_codes[0]}`
  return typeof value.error === 'string' && ['invalid_client', 'invalid_grant', 'invalid_scope', 'unauthorized_client', 'interaction_required', 'consent_required', 'temporarily_unavailable'].includes(value.error) ? value.error : 'PROVIDER_ERROR'
}
