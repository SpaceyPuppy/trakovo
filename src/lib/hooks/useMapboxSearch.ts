'use client'
import { useState, useEffect, useRef } from 'react'

export interface MapboxPlace {
  id: string
  place_name: string
  text: string
  center: [number, number] // [lng, lat]
}

export function useMapboxSearch(query: string, proximity?: [number, number]) {
  const [results, setResults] = useState<MapboxPlace[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (query.length < 3) {
      setResults([])
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!token) { setLoading(false); return }

        const prox = proximity
          ? `&proximity=${proximity[0]},${proximity[1]}`
          : '&proximity=144.3194,-35.8729'

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=AU${prox}&types=address,place,poi&limit=5&access_token=${token}`
        const res = await fetch(url)
        const data = await res.json()
        setResults(data.features ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, proximity])

  return { results, loading }
}
