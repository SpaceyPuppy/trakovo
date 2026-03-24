'use client'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const RECENT_DESTINATIONS = [
  { key: 'd1', label: 'Cohuna Hospital', address: 'King George St, Cohuna' },
  { key: 'd2', label: 'Cohuna Post Office', address: '68 King George St, Cohuna' },
  { key: 'd3', label: 'Cohuna IGA', address: 'Murray St, Cohuna' },
  { key: 'd4', label: 'Gunbower Hotel', address: 'Gunbower VIC 3566' },
  { key: 'd5', label: 'Kerang Railway Station', address: 'Kerang VIC 3579' },
]

function DestinationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pickup = searchParams.get('pickup') || 'Current location'

  function selectDestination(dest: string) {
    router.push(`/book/taxi/confirm?destination=${encodeURIComponent(dest)}`)
  }

  return (
    <div className="book-screen flex flex-col" style={{ minHeight: '100dvh', background: '#f7f6f3' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-4"
        style={{ background: 'white', borderBottom: '0.5px solid #e2e0db' }}
      >
        <button
          onClick={() => router.back()}
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: '#f7f6f3', border: '0.5px solid #e2e0db' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#141414' }}>
          Set destination
        </h1>
      </div>

      {/* Pickup / Dropoff fields */}
      <div style={{ background: 'white', padding: '16px' }}>
        <div className="flex gap-3">
          {/* Route indicator */}
          <div className="flex flex-col items-center shrink-0 pt-3">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4570a' }} />
            <div style={{ width: 1.5, height: 28, background: 'linear-gradient(to bottom, #d4570a, #a8a8a8)', margin: '2px 0' }} />
            <div style={{ width: 10, height: 10, background: '#1e2330', borderRadius: 2 }} />
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-2">
            {/* Pickup */}
            <div
              className="flex items-center gap-2 px-3"
              style={{
                height: 40, borderRadius: 10,
                background: '#f7f6f3',
                border: '0.5px solid #e2e0db',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#717171' }}>{pickup}</span>
            </div>
            {/* Dropoff */}
            <div
              className="flex items-center gap-2 px-3"
              style={{
                height: 40, borderRadius: 10,
                background: 'white',
                border: '1.5px solid #d4570a',
                boxShadow: '0 0 0 3px rgba(212,87,10,0.08)',
              }}
            >
              <span style={{ fontSize: 13, color: '#a8a8a8', flex: 1 }}>Where to?</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        </div>

        <div style={{ height: '0.5px', background: '#e2e0db', margin: '16px -16px 0' }} />
      </div>

      {/* Recent destinations */}
      <div className="flex-1 px-4 pt-4">
        <p style={{ fontSize: 9, fontWeight: 600, color: '#a8a8a8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Recent Destinations
        </p>
        <div className="space-y-0">
          {RECENT_DESTINATIONS.map((dest, i) => (
            <button
              key={dest.key}
              onClick={() => selectDestination(dest.label)}
              className="w-full flex items-center gap-3 py-3 text-left transition-all"
              style={{ borderBottom: i < RECENT_DESTINATIONS.length - 1 ? '0.5px solid #eeece8' : 'none' }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'white',
                border: '0.5px solid #e2e0db',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>{dest.label}</p>
                <p style={{ fontSize: 10, color: '#a8a8a8' }}>{dest.address}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
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
