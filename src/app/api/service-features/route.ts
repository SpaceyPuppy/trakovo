import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface FeatureRow {
  feature_key: string
  config: string | null
}

export async function GET(req: NextRequest) {
  const serviceType = req.nextUrl.searchParams.get('service_type')
  if (!serviceType) return NextResponse.json({ error: 'service_type required' }, { status: 400 })

  const rows = await query<FeatureRow>(
    'SELECT feature_key, config FROM ServiceFeature WHERE service_type = ? AND is_enabled = 1',
    [serviceType]
  )

  const features: Record<string, { enabled: true; config: unknown }> = {}
  for (const row of rows) {
    features[row.feature_key] = {
      enabled: true,
      config: row.config ? JSON.parse(row.config) : null,
    }
  }

  return NextResponse.json({ features }, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
