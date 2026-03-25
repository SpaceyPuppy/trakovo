import { query } from '@/lib/db'
import { TEMPLATE_META } from '@/lib/email-template-defaults'
import { SMS_TEMPLATE_META } from '@/lib/sms-template-defaults'
import TemplatesForm from './TemplatesForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Templates' }
export const revalidate = 0

export default async function TemplatesPage() {
  const emailBodyKeys = Object.values(TEMPLATE_META).map(m => m.key)
  const emailEnabledKeys = emailBodyKeys.map(k => `${k}_enabled`)
  const smsBodyKeys = Object.values(SMS_TEMPLATE_META).map(m => m.key)
  const smsEnabledKeys = Object.values(SMS_TEMPLATE_META).map(m => m.enabledKey)

  const allKeys = [...emailBodyKeys, ...emailEnabledKeys, ...smsBodyKeys, ...smsEnabledKeys]
  const placeholders = allKeys.map(() => '?').join(',')

  const rows = await query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM Setting WHERE \`key\` IN (${placeholders})`,
    allKeys
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  return <TemplatesForm settings={settings} />
}
