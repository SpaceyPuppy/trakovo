import { queryOne } from '@/lib/db'

const SMS_API = 'https://sms.crazytel.net.au/api/v1/sms/send'

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

    const res = await fetch(SMS_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, from: fromNumber, message }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errMsg = body.message ?? body.error
      return { ok: false, error: errMsg ?? `SMS failed (${res.status}): ${JSON.stringify(body)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SMS send failed' }
  }
}
