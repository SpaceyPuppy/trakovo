'use client'
import { useState, useEffect } from 'react'

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

export function useServiceFeatures(serviceType: string): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)

  useEffect(() => {
    fetch(`/api/service-features?service_type=${encodeURIComponent(serviceType)}`)
      .then(r => r.json())
      .then(data => {
        const f = data?.features ?? {}
        setFlags({
          rating: Boolean(f.rating?.enabled),
          rating_comment: Boolean(f.rating_comment?.enabled),
          share_trip: Boolean(f.share_trip?.enabled),
          live_tracking: Boolean(f.live_tracking?.enabled),
        })
      })
      .catch(() => setFlags(DEFAULT_FLAGS))
  }, [serviceType])

  return flags
}
