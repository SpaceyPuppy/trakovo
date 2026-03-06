import { query } from '@/lib/db'
import GeneralForm from './GeneralForm'

export const revalidate = 0

export default async function SettingsPage() {
  const rows = await query<{ key: string; value: string }>(
    'SELECT `key`, value FROM Setting WHERE `key` IN (?, ?, ?, ?, ?, ?)',
    ['notification_email', 'business_name', 'contact_phone', 'logo_path', 'site_name', 'admin_name']
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  return <GeneralForm initial={settings} />
}
