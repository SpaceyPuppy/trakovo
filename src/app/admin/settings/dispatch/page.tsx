import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import DispatchForm from './DispatchForm'

export const revalidate = 0

interface FeatureRow {
  id: string
  service_type: string
  feature_key: string
  is_enabled: number
  config: string | null
}

export default async function DispatchSettingsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const rows = await query<FeatureRow>(
    'SELECT id, service_type, feature_key, is_enabled, config FROM ServiceFeature ORDER BY service_type, feature_key'
  )

  const features: Record<string, { id: string; feature_key: string; is_enabled: boolean; config: unknown }[]> = {}
  for (const row of rows) {
    if (!features[row.service_type]) features[row.service_type] = []
    features[row.service_type].push({
      id: row.id,
      feature_key: row.feature_key,
      is_enabled: Boolean(row.is_enabled),
      config: row.config ? JSON.parse(row.config) : null,
    })
  }

  return <DispatchForm initialFeatures={features} />
}
