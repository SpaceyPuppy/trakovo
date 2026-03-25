'use client'
import { useState, useEffect } from 'react'

export interface RouteResult {
  geometry: GeoJSON.LineString
  distance_m: number
  duration_s: number
  fare_cents: number
}

export function calcFare(distance_m: number): number {
  const km = distance_m / 1000
  return Math.max(800, 350 + Math.floor(km * 220))
}

export function useRoute(
  pickup: [number, number] | null,
  dest: [number, number] | null,
) {
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pickup || !dest) return

    setLoading(true)
    setError(null)

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) { setLoading(false); setError('No Mapbox token'); return }

    const coords = `${pickup[0]},${pickup[1]};${dest[0]},${dest[1]}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const leg = data.routes?.[0]
        if (!leg) { setError('No route found'); return }
        setRoute({
          geometry: leg.geometry,
          distance_m: leg.distance,
          duration_s: leg.duration,
          fare_cents: calcFare(leg.distance),
        })
      })
      .catch(() => setError('Route fetch failed'))
      .finally(() => setLoading(false))
  }, [pickup?.[0], pickup?.[1], dest?.[0], dest?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  return { route, loading, error }
}
