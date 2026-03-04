import { prisma } from '@/lib/db'
import ConnectionsForm from './ConnectionsForm'
import PushCard from './PushCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connections' }
export const revalidate = 0

export default async function ConnectionsPage() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['ms_connected_email', 'gc_connected_email'] } },
  })
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  )
  const smtpVars: Record<string, boolean> = {
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_PORT: Boolean(process.env.SMTP_PORT),
    SMTP_SECURE: Boolean(process.env.SMTP_SECURE),
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_FROM: Boolean(process.env.SMTP_FROM),
  }

  const pushConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

  return (
    <div className="space-y-6">
      <ConnectionsForm
        smtpConfigured={smtpConfigured}
        smtpVars={smtpVars}
        msConfigured={Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET && process.env.MS_TENANT_ID)}
        msConnected={Boolean(settings.ms_connected_email)}
        msConnectedEmail={settings.ms_connected_email ?? ''}
        gcConfigured={Boolean(process.env.GC_CLIENT_ID && process.env.GC_CLIENT_SECRET)}
        gcConnected={Boolean(settings.gc_connected_email)}
        gcConnectedEmail={settings.gc_connected_email ?? ''}
      />
      <PushCard pushConfigured={pushConfigured} />
    </div>
  )
}
