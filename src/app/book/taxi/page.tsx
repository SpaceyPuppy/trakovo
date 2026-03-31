'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useMapboxSearch } from '@/lib/hooks/useMapboxSearch'

const TaxiMap = dynamic(() => import('@/components/book/TaxiMap'), { ssr: false })

// Default centre: Cohuna, VIC
const DEFAULT_LNG = 144.3194
const DEFAULT_LAT = -35.8729

function TaxiHomeContent() {
  const router = useRouter()

  // Pickup state
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [pickupName, setPickupName] = useState('Current location')
  const [pickupInput, setPickupInput] = useState('')
  const [pickupFocused, setPickupFocused] = useState(false)

  // Destination state
  const [destInput, setDestInput] = useState('')
  const [destFocused, setDestFocused] = useState(false)

  const { results: pickupResults, loading: pickupSearching } = useMapboxSearch(
    pickupFocused && pickupInput.length >= 3 ? pickupInput : '',
    coords ?? [DEFAULT_LNG, DEFAULT_LAT]
  )
  const { results: destResults, loading: destSearching } = useMapboxSearch(
    destFocused && destInput.length >= 3 ? destInput : '',
    coords ?? [DEFAULT_LNG, DEFAULT_LAT]
  )

  useEffect(() => { locateMe() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function locateMe() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { longitude, latitude } = pos.coords
          setCoords([longitude, latitude])
          setPickupName('Current location')
          setPickupInput('')
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          if (token) {
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address,place&limit=1&access_token=${token}`)
              .then(r => r.json())
              .then(d => {
                if (d.features?.[0]) setPickupName((d.features[0].place_name || d.features[0].text).replace(', Australia', ''))
              })
              .catch(() => {})
          }
        },
        () => setCoords([DEFAULT_LNG, DEFAULT_LAT])
      )
    } else {
      setCoords([DEFAULT_LNG, DEFAULT_LAT])
    }
  }

  function selectPickup(place: { center: [number, number]; place_name: string; text: string }) {
    setCoords([place.center[0], place.center[1]])
    setPickupName(place.place_name.replace(', Australia', ''))
    setPickupInput('')
    setPickupFocused(false)
  }

  function selectDestination(place: { center: [number, number]; place_name: string; text: string }) {
    const params = new URLSearchParams({
      pickup_name: pickupName,
      pickup_lat: String(coords?.[1] ?? DEFAULT_LAT),
      pickup_lng: String(coords?.[0] ?? DEFAULT_LNG),
      dest_name: place.place_name.replace(', Australia', ''),
      dest_lat: String(place.center[1]),
      dest_lng: String(place.center[0]),
    })
    router.push(`/book/taxi/confirm?${params}`)
  }

  // Show typed value while focused, resolved name otherwise
  const pickupDisplayValue = pickupFocused ? pickupInput : pickupName
  const showPickupResults = pickupFocused && pickupInput.length >= 3
  const showDestResults = destFocused && destInput.length >= 3

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
      </div>

      {/* Controls panel */}
      <div
        className="bg-white lg:w-[400px] lg:h-screen lg:overflow-y-auto flex flex-col"
        style={{ borderRadius: '18px 18px 0 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 pt-4 pb-6 lg:pt-8 lg:px-6">
          <h2 className="hidden lg:block font-display font-bold text-[22px] tracking-tight mb-5" style={{ color: '#141414' }}>
            Book a taxi
          </h2>

          {/* Pickup + destination combined card */}
          <div style={{ background: '#f7f6f3', border: '0.5px solid #e2e0db', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            {/* Pickup row */}
            <div className="flex items-center gap-2.5 px-3" style={{ height: 48, borderBottom: '0.5px solid #e2e0db' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4570a', flexShrink: 0 }} />
              <input
                value={pickupDisplayValue}
                onChange={e => setPickupInput(e.target.value)}
                onFocus={() => { setPickupFocused(true); setDestFocused(false) }}
                onBlur={() => setTimeout(() => setPickupFocused(false), 160)}
                placeholder="Pickup location"
                className="flex-1 text-[13px] outline-none bg-transparent truncate"
                style={{ color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
                autoComplete="off"
              />
              {/* Locate me button */}
              <button
                onMouseDown={e => { e.preventDefault(); locateMe() }}
                title="Use current location"
                className="flex items-center justify-center rounded-full transition-all active:scale-95 hover:bg-[#eeece8]"
                style={{ width: 28, height: 28, flexShrink: 0 }}
                aria-label="Use current location"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
                </svg>
              </button>
            </div>

            {/* Destination row */}
            <div className="flex items-center gap-2.5 px-3" style={{ height: 48 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1e2330', flexShrink: 0 }} />
              <input
                value={destInput}
                onChange={e => setDestInput(e.target.value)}
                onFocus={() => { setDestFocused(true); setPickupFocused(false) }}
                onBlur={() => setTimeout(() => setDestFocused(false), 160)}
                placeholder="Where to?"
                className="flex-1 text-[13px] outline-none bg-transparent"
                style={{ color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
                autoComplete="off"
              />
              {destInput && (
                <button
                  onMouseDown={e => { e.preventDefault(); setDestInput('') }}
                  aria-label="Clear destination"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search results */}
          {showPickupResults && (
            <SearchResults loading={pickupSearching} results={pickupResults} onSelect={selectPickup} />
          )}
          {!showPickupResults && showDestResults && (
            <SearchResults loading={destSearching} results={destResults} onSelect={selectDestination} />
          )}
        </div>
      </div>
    </div>
  )
}

function SearchResults({
  loading,
  results,
  onSelect,
}: {
  loading: boolean
  results: { id: string; center: [number, number]; place_name: string; text: string }[]
  onSelect: (place: { id: string; center: [number, number]; place_name: string; text: string }) => void
}) {
  return (
    <div style={{ borderRadius: 10, border: '0.5px solid #e2e0db', overflow: 'hidden', background: 'white', marginBottom: 8 }}>
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3" style={{ color: '#9a9894', fontSize: 12 }}>
          <div style={{ width: 14, height: 14, border: '2px solid #e2e0db', borderTopColor: '#d4570a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Searching…
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3" style={{ color: '#9a9894', fontSize: 12 }}>No results found</div>
      ) : results.map((place, i) => (
        <button
          key={place.id}
          onMouseDown={e => { e.preventDefault(); onSelect(place) }}
          className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7f6f3] active:bg-[#f0efe9]"
          style={{ borderTop: i > 0 ? '0.5px solid #f0efe9' : 'none' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, color: '#141414', lineHeight: '1.3' }}>{place.place_name.replace(', Australia', '')}</p>
          </div>
        </button>
      ))}
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
