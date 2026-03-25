'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMapboxSearch } from '@/lib/hooks/useMapboxSearch'

function DestinationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pickupName = searchParams.get('pickup_name') || 'Current location'
  const pickupLat = parseFloat(searchParams.get('pickup_lat') || '-35.8729')
  const pickupLng = parseFloat(searchParams.get('pickup_lng') || '144.3194')

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { results, loading } = useMapboxSearch(query, [pickupLng, pickupLat])

  useEffect(() => { inputRef.current?.focus() }, [])

  function selectPlace(place: { center: [number, number]; place_name: string; text: string }) {
    const params = new URLSearchParams({
      pickup_name: pickupName,
      pickup_lat: String(pickupLat),
      pickup_lng: String(pickupLng),
      dest_name: place.text || place.place_name,
      dest_lat: String(place.center[1]),
      dest_lng: String(place.center[0]),
    })
    router.push(`/book/taxi/confirm?${params}`)
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: '#f7f6f3', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-safe-top" style={{ borderBottom: '0.5px solid #e2e0db' }}>
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0"
            style={{ width: 36, height: 36, background: '#f0efe9', border: 'none' }}
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 flex flex-col gap-2">
            {/* Pickup (read-only) */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ background: '#f7f6f3', border: '0.5px solid #e2e0db' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4570a', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#717171' }}>{pickupName}</span>
            </div>
            {/* Destination input */}
            <div className="relative flex items-center">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1e2330', flexShrink: 0, marginLeft: 8, marginRight: 8 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Where to?"
                className="flex-1 outline-none text-[13px]"
                style={{ background: 'transparent', color: '#141414', fontFamily: 'Epilogue, sans-serif', padding: '6px 0' }}
                onKeyDown={e => e.key === 'Enter' && results[0] && selectPlace(results[0])}
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1" aria-label="Clear">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.length >= 3 && (
          <div>
            {loading && (
              <div className="flex items-center gap-2 px-4 py-4" style={{ color: '#9a9894', fontSize: 12 }}>
                <div style={{ width: 14, height: 14, border: '2px solid #e2e0db', borderTopColor: '#d4570a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-4" style={{ color: '#9a9894', fontSize: 13 }}>No results for &ldquo;{query}&rdquo;</div>
            )}
            {results.map(place => (
              <button
                key={place.id}
                onClick={() => selectPlace(place)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white active:bg-white"
                style={{ borderBottom: '0.5px solid #eeece8' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', border: '0.5px solid #e2e0db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#141414' }}>{place.text}</p>
                  <p style={{ fontSize: 11, color: '#9a9894', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.place_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Placeholder when no query */}
        {query.length < 3 && (
          <div className="px-4 py-6">
            <p style={{ fontSize: 12, color: '#9a9894' }}>Type at least 3 characters to search</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DestinationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#f7f6f3' }} />}>
      <DestinationContent />
    </Suspense>
  )
}
