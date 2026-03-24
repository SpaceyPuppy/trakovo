import { query } from '@/lib/db'

export interface FeatureFlags {
  rating: boolean
  rating_comment: boolean
  share_trip: boolean
  live_tracking: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  rating: false,
  rating_comment: false,
  share_trip: false,
  live_tracking: false,
}

export async function getServiceFeatures(serviceType: string): Promise<FeatureFlags> {
  try {
    const rows = await query<{ feature_key: string }>(
      'SELECT feature_key FROM ServiceFeature WHERE service_type = ? AND is_enabled = 1',
      [serviceType]
    )
    const enabled = new Set(rows.map(r => r.feature_key))
    return {
      rating: enabled.has('rating'),
      rating_comment: enabled.has('rating_comment'),
      share_trip: enabled.has('share_trip'),
      live_tracking: enabled.has('live_tracking'),
    }
  } catch {
    return DEFAULT_FLAGS
  }
}
