import { query } from '@/lib/db'
import ConnectionsForm from './ConnectionsForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connections' }
export const revalidate = 0

export default async function ConnectionsPage() {
  const rows = await query<{ key: string; value: string }>(
    'SELECT `key`, value FROM Setting WHERE `key` IN (?, ?, ?, ?, ?, ?, ?, ?)',
    ['ms_connected_email', 'ms_calendar_id', 'ms_calendar_name', 'crazytel_enabled', 'crazytel_api_key', 'crazytel_account_api_key', 'crazytel_from_number', 'crazytel_dispatch_number']
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const smtpVars: Record<string, boolean> = {
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_PORT: Boolean(process.env.SMTP_PORT),
    SMTP_SECURE: Boolean(process.env.SMTP_SECURE),
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_FROM: Boolean(process.env.SMTP_FROM),
  }

  return (
    <ConnectionsForm
      smtpConfigured={smtpConfigured}
      smtpVars={smtpVars}
      msConfigured={Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_TENANT_ID)}
      msConnected={Boolean(settings.ms_connected_email)}
      msConnectedEmail={settings.ms_connected_email ?? ''}
      msCalendarId={settings.ms_calendar_id ?? ''}
      msCalendarName={settings.ms_calendar_name ?? ''}
      pushConfigured={Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)}
      crazytelEnabled={settings.crazytel_enabled === '1'}
      crazytelApiKeySet={Boolean(settings.crazytel_api_key)}
      crazytelAccountKeySet={Boolean(settings.crazytel_account_api_key)}
      crazytelFromNumber={settings.crazytel_from_number ?? ''}
      crazytelDispatchNumber={settings.crazytel_dispatch_number ?? ''}
    />
  )
}
