import { query } from '@/lib/db'
import GeneralForm from './GeneralForm'

export const revalidate = 0

export default async function SettingsPage() {
  const rows = await query<{ key: string; value: string }>(
    'SELECT `key`, value FROM Setting WHERE `key` IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['notification_email', 'business_name', 'contact_phone', 'logo_path', 'pwa_icon_path', 'hero_image_path', 'site_name', 'admin_name', 'driver_name', 'vendor_name', 'site_url',
     'email_on_new_booking', 'email_on_customer_received', 'email_on_booking_confirmed', 'email_on_24hr_reminder', 'email_on_followup']
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  return <GeneralForm initial={settings} />
}
