import { query } from '@/lib/db'
import TemplatesForm from './TemplatesForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Email Templates' }
export const revalidate = 0

export default async function TemplatesPage() {
  const rows = await query<{ key: string; value: string }>(
    'SELECT `key`, value FROM Setting WHERE `key` IN (?, ?)',
    ['email_template_booking_notification', 'email_template_customer_quote']
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  return <TemplatesForm initial={settings} />
}
