import { queryOne } from '@/lib/db'

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const [apiKeyRow, fromRow, enabledRow] = await Promise.all([
      queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_api_key']),
      queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_from_number']),
      queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', ['crazytel_enabled']),
    ])

    const apiKey = apiKeyRow?.value?.trim()
    const fromNumber = fromRow?.value?.trim()
    const enabled = enabledRow?.value === '1'

    if (!enabled) return { ok: false, error: 'SMS not enabled' }
    if (!apiKey || !fromNumber) return { ok: false, error: 'SMS not configured' }

    const params = new URLSearchParams({ from_number: fromNumber, to_number: to, message })
    const res = await fetch(`https://crazytel.io/api/v1/sms/send?${params}`, {
      method: 'POST',
      headers: { 'X-Crazytel-Api-Key': apiKey },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, error: body.message ?? `SMS failed (${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SMS send failed' }
  }
}
