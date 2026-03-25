'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useMapboxSearch } from '@/lib/hooks/useMapboxSearch'

const TaxiMap = dynamic(() => import('@/components/book/TaxiMap'), { ssr: false })

// Default centre: Cohuna, VIC
const DEFAULT_LNG = 144.3194
const DEFAULT_LAT = -35.8729

function TaxiHomeContent() {
  const router = useRouter()
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [locationName, setLocationName] = useState('Current location')
  const [search, setSearch] = useState('')
  const { results, loading: searching } = useMapboxSearch(search, coords ?? [DEFAULT_LNG, DEFAULT_LAT])

  // Request geolocation on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { longitude, latitude } = pos.coords
          setCoords([longitude, latitude])
          // Reverse-geocode for display name
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          if (token) {
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address,place&limit=1&access_token=${token}`)
              .then(r => r.json())
              .then(d => {
                if (d.features?.[0]) setLocationName(d.features[0].text || d.features[0].place_name)
              })
              .catch(() => {})
          }
        },
        () => setCoords([DEFAULT_LNG, DEFAULT_LAT])
      )
    } else {
      setCoords([DEFAULT_LNG, DEFAULT_LAT])
    }
  }, [])

  function selectDestination(place: { center: [number, number]; place_name: string; text: string }) {
    const params = new URLSearchParams({
      pickup_name: locationName,
      pickup_lat: String(coords?.[1] ?? DEFAULT_LAT),
      pickup_lng: String(coords?.[0] ?? DEFAULT_LNG),
      dest_name: place.text || place.place_name,
      dest_lat: String(place.center[1]),
      dest_lng: String(place.center[0]),
    })
    router.push(`/book/taxi/confirm?${params}`)
  }

  function goToSearch() {
    const params = new URLSearchParams({
      pickup_name: locationName,
      pickup_lat: String(coords?.[1] ?? DEFAULT_LAT),
      pickup_lng: String(coords?.[0] ?? DEFAULT_LNG),
    })
    router.push(`/book/taxi/destination?${params}`)
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen" style={{ minHeight: '100dvh' }}>
      {/* Map */}
      <div className="relative lg:flex-1 h-[55vh] lg:h-full">
        <TaxiMap pickup={coords} style={{ width: '100%', height: '100%' }} />

        {/* Back button */}
        <button
          onClick={() => router.push('/book')}
          className="absolute top-4 left-4 flex items-center justify-center rounded-full bg-white shadow-md transition-all active:scale-95"
          style={{ width: 36, height: 36, border: '0.5px solid rgba(0,0,0,0.08)', zIndex: 10 }}
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Location chip (mobile only) */}
        {coords && (
          <div className="absolute bottom-4 left-4 right-4 lg:hidden" style={{ zIndex: 10 }}>
            <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-md" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4570a', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#3a3a3a', fontWeight: 500 }}>{locationName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div
        className="bg-white lg:w-[400px] lg:h-screen lg:overflow-y-auto flex flex-col"
        style={{ borderRadius: '18px 18px 0 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 pt-4 pb-6 lg:pt-8 lg:px-6">
          {/* Desktop: heading */}
          <h2 className="hidden lg:block font-display font-bold text-[22px] tracking-tight mb-5" style={{ color: '#141414' }}>
            Where to?
          </h2>

          {/* Search input */}
          <div className="relative mb-4">
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search destination…"
              className="w-full rounded-[10px] pl-9 pr-4 text-[13px] outline-none"
              style={{ height: 44, background: '#f7f6f3', border: '0.5px solid #e2e0db', color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
              onKeyDown={e => e.key === 'Enter' && results[0] && selectDestination(results[0])}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results */}
          {search.length >= 3 && (
            <div className="mb-4" style={{ borderRadius: 10, border: '0.5px solid #e2e0db', overflow: 'hidden', background: 'white' }}>
              {searching && (
                <div className="flex items-center gap-2 px-4 py-3" style={{ color: '#9a9894', fontSize: 12 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid #e2e0db', borderTopColor: '#d4570a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Searching…
                </div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-4 py-3" style={{ color: '#9a9894', fontSize: 12 }}>No results found</div>
              )}
              {results.map(place => (
                <button
                  key={place.id}
                  onClick={() => selectDestination(place)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7f6f3] active:bg-[#f0efe9]"
                  style={{ borderTop: '0.5px solid #f0efe9' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#141414', lineHeight: '1.3' }}>{place.text}</p>
                    <p style={{ fontSize: 11, color: '#9a9894', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.place_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Mobile search button (when not searching) */}
          {!search && (
            <>
              {/* Full search button (mobile) */}
              <button
                onClick={goToSearch}
                className="lg:hidden mt-4 w-full flex items-center justify-center gap-2 rounded-[12px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  height: 50, fontSize: 14,
                  background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Enter destination
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TaxiHomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#f7f6f3' }} />}>
      <TaxiHomeContent />
    </Suspense>
  )
}
