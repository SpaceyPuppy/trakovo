import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'

interface FeatureRow {
  id: string
  service_type: string
  feature_key: string
  is_enabled: number
  config: string | null
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<FeatureRow>(
    'SELECT id, service_type, feature_key, is_enabled, config FROM ServiceFeature ORDER BY service_type, feature_key'
  )

  const grouped: Record<string, { id: string; feature_key: string; is_enabled: boolean; config: unknown }[]> = {}
  for (const row of rows) {
    if (!grouped[row.service_type]) grouped[row.service_type] = []
    grouped[row.service_type].push({
      id: row.id,
      feature_key: row.feature_key,
      is_enabled: Boolean(row.is_enabled),
      config: row.config ? JSON.parse(row.config) : null,
    })
  }

  return NextResponse.json({ features: grouped })
}
