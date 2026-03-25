import { queryOne } from '@/lib/db'
import { sendSms } from '@/lib/sms'
import { SMS_TEMPLATE_META, renderSmsBody, type SmsTemplateKey } from '@/lib/sms-template-defaults'

export async function sendSmsNotification(
  templateKey: SmsTemplateKey,
  to: string,
  vars: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const meta = SMS_TEMPLATE_META[templateKey]

  const [bodyRow, enabledRow] = await Promise.all([
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', [meta.key]),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = ?', [meta.enabledKey]),
  ])

  // Default to enabled if the flag has never been saved
  if (enabledRow?.value === '0') return { ok: false, error: 'Template disabled' }

  const body = bodyRow?.value?.trim() || meta.default
  const message = renderSmsBody(body, vars)

  return sendSms(to, message)
}
