'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Metadata } from 'next'

// Styled SVG placeholder map of Cohuna-like street grid
function PlaceholderMap() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 380" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
      <rect width="390" height="380" fill="#e8e4dd" />
      {/* Main roads */}
      <rect x="0" y="90" width="390" height="12" fill="#d8d4cc" />
      <rect x="0" y="180" width="390" height="12" fill="#d8d4cc" />
      <rect x="0" y="270" width="390" height="12" fill="#d8d4cc" />
      <rect x="70" y="0" width="12" height="380" fill="#d8d4cc" />
      <rect x="170" y="0" width="12" height="380" fill="#d8d4cc" />
      <rect x="280" y="0" width="12" height="380" fill="#d8d4cc" />
      {/* Secondary roads */}
      <rect x="0" y="140" width="390" height="6" fill="#ddd9d2" />
      <rect x="0" y="230" width="390" height="6" fill="#ddd9d2" />
      <rect x="120" y="0" width="6" height="380" fill="#ddd9d2" />
      <rect x="220" y="0" width="6" height="380" fill="#ddd9d2" />
      <rect x="330" y="0" width="6" height="380" fill="#ddd9d2" />
      {/* Building blocks */}
      <rect x="82" y="10" width="28" height="24" rx="2" fill="#d4d0c8" />
      <rect x="120" y="10" width="40" height="24" rx="2" fill="#d4d0c8" />
      <rect x="182" y="10" width="28" height="24" rx="2" fill="#d4d0c8" />
      <rect x="236" y="10" width="32" height="24" rx="2" fill="#d4d0c8" />
      <rect x="82" y="50" width="22" height="28" rx="2" fill="#ccc8c0" />
      <rect x="126" y="50" width="34" height="28" rx="2" fill="#ccc8c0" />
      <rect x="182" y="50" width="28" height="28" rx="2" fill="#ccc8c0" />
      <rect x="240" y="50" width="28" height="20" rx="2" fill="#ccc8c0" />
      <rect x="292" y="50" width="36" height="28" rx="2" fill="#ccc8c0" />
      <rect x="82" y="104" width="26" height="24" rx="2" fill="#d4d0c8" />
      <rect x="126" y="104" width="36" height="30" rx="2" fill="#d4d0c8" />
      <rect x="182" y="104" width="30" height="24" rx="2" fill="#d4d0c8" />
      <rect x="232" y="104" width="36" height="30" rx="2" fill="#d4d0c8" />
      <rect x="292" y="104" width="28" height="24" rx="2" fill="#d4d0c8" />
      <rect x="82" y="154" width="30" height="18" rx="2" fill="#ccc8c0" />
      <rect x="126" y="154" width="40" height="18" rx="2" fill="#ccc8c0" />
      <rect x="182" y="154" width="28" height="18" rx="2" fill="#ccc8c0" />
      <rect x="240" y="154" width="32" height="18" rx="2" fill="#ccc8c0" />
      <rect x="82" y="192" width="28" height="26" rx="2" fill="#d4d0c8" />
      <rect x="126" y="192" width="36" height="26" rx="2" fill="#d4d0c8" />
      <rect x="182" y="192" width="30" height="26" rx="2" fill="#d4d0c8" />
      <rect x="240" y="192" width="28" height="26" rx="2" fill="#d4d0c8" />
      <rect x="82" y="236" width="26" height="22" rx="2" fill="#ccc8c0" />
      <rect x="126" y="236" width="32" height="22" rx="2" fill="#ccc8c0" />
      <rect x="182" y="236" width="28" height="22" rx="2" fill="#ccc8c0" />
      <rect x="240" y="236" width="36" height="22" rx="2" fill="#ccc8c0" />
      <rect x="292" y="236" width="26" height="22" rx="2" fill="#ccc8c0" />
      <rect x="82" y="282" width="28" height="30" rx="2" fill="#d4d0c8" />
      <rect x="126" y="282" width="40" height="30" rx="2" fill="#d4d0c8" />
      <rect x="182" y="282" width="28" height="30" rx="2" fill="#d4d0c8" />
      <rect x="240" y="282" width="32" height="30" rx="2" fill="#d4d0c8" />
      <rect x="292" y="282" width="28" height="30" rx="2" fill="#d4d0c8" />
      {/* Street name labels */}
      <text x="10" y="89" fontSize="7" fill="#b0aca4" fontFamily="sans-serif">Murray St</text>
      <text x="10" y="179" fontSize="7" fill="#b0aca4" fontFamily="sans-serif">King George St</text>
      <text x="10" y="269" fontSize="7" fill="#b0aca4" fontFamily="sans-serif">Victoria St</text>
      <text x="73" y="22" fontSize="7" fill="#b0aca4" fontFamily="sans-serif" writingMode="vertical-rl">Punt Rd</text>
      <text x="173" y="22" fontSize="7" fill="#b0aca4" fontFamily="sans-serif" writingMode="vertical-rl">Main St</text>
      {/* Park/green area */}
      <rect x="10" y="10" width="52" height="72" rx="4" fill="#d8e8d0" />
      <rect x="340" y="10" width="42" height="72" rx="4" fill="#d8e8d0" />
      {/* User location pin */}
      <g transform="translate(195, 190)">
        {/* Pulse rings */}
        <circle cx="0" cy="0" r="16" fill="rgba(212,87,10,0.08)" className="animate-loc-pulse" style={{ transformOrigin: 'center' }} />
        <circle cx="0" cy="0" r="10" fill="rgba(212,87,10,0.12)" className="animate-loc-pulse-2" style={{ transformOrigin: 'center' }} />
        {/* Pin */}
        <circle cx="0" cy="0" r="8" fill="#d4570a" stroke="white" strokeWidth="3" />
      </g>
      {/* Nearby driver markers */}
      <g transform="translate(110, 130)" opacity="0.45">
        <circle cx="0" cy="0" r="10" fill="#1e2330" stroke="white" strokeWidth="2" />
        <text x="0" y="4" fontSize="8" fill="white" textAnchor="middle">🚗</text>
      </g>
      <g transform="translate(270, 230)" opacity="0.55">
        <circle cx="0" cy="0" r="10" fill="#1e2330" stroke="white" strokeWidth="2" />
        <text x="0" y="4" fontSize="8" fill="white" textAnchor="middle">🚗</text>
      </g>
      <g transform="translate(320, 110)" opacity="0.4">
        <circle cx="0" cy="0" r="10" fill="#1e2330" stroke="white" strokeWidth="2" />
        <text x="0" y="4" fontSize="8" fill="white" textAnchor="middle">🚗</text>
      </g>
    </svg>
  )
}

const SAVED_PLACES = [
  { key: 'home', label: 'Home', address: '24 Punt Rd', accent: '#d4570a', icon: '🏠' },
  { key: 'work', label: 'Work', address: 'Main St CBD', accent: '#1D9E75', icon: '💼' },
]

const RECENT_PLACES = [
  { key: 'r1', label: 'Cohuna Hospital', address: 'King George St', destination: 'Cohuna Hospital' },
  { key: 'r2', label: 'Cohuna Post Office', address: '68 King George St', destination: 'Cohuna Post Office' },
  { key: 'r3', label: 'Cohuna IGA', address: 'Murray St', destination: 'Cohuna IGA' },
]

export default function TaxiMapPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: '#e8e4dd', position: 'relative' }}>
      {/* Map area */}
      <div style={{ flex: 1, position: 'relative', minHeight: '240px', maxHeight: '50vh' }}>
        <PlaceholderMap />

        {/* Back button */}
        <Link
          href="/book"
          className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-full transition-all"
          style={{
            width: 32, height: 32,
            background: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        {/* "Where to?" search bar */}
        <button
          onClick={() => router.push('/book/taxi/destination')}
          className="absolute left-4 right-4 z-10 flex items-center gap-3 px-4 transition-all"
          style={{
            top: '52px',
            height: '44px',
            background: 'white',
            borderRadius: '14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)',
            border: '0.5px solid rgba(0,0,0,0.06)',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 14, color: '#a8a8a8', fontWeight: 500 }}>Where to?</span>
        </button>
      </div>

      {/* Bottom sheet */}
      <div
        className="book-sheet"
        style={{
          background: 'white',
          borderRadius: '18px 18px 0 0',
          borderTop: '0.5px solid rgba(0,0,0,0.06)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          padding: '0 0 32px',
          flex: 1,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 16 }}>
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 space-y-5">
          {/* Saved places */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#a8a8a8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Saved Places
            </p>
            <div className="flex gap-3">
              {SAVED_PLACES.map(place => (
                <button
                  key={place.key}
                  onClick={() => router.push(`/book/taxi/destination?pickup=${encodeURIComponent(place.address)}`)}
                  className="flex-1 flex items-center gap-2 p-3 rounded-[10px] text-left transition-all"
                  style={{
                    background: 'white',
                    border: '0.5px solid #e2e0db',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${place.accent}18`,
                    border: `0.5px solid ${place.accent}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0,
                  }}>
                    {place.icon}
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#141414', lineHeight: 1.2 }}>{place.label}</p>
                    <p style={{ fontSize: 9, color: '#a8a8a8', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#a8a8a8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Recent
            </p>
            <div className="divide-y" style={{ borderTop: '0.5px solid #eeece8', borderBottom: '0.5px solid #eeece8' }}>
              {RECENT_PLACES.map(place => (
                <button
                  key={place.key}
                  onClick={() => router.push(`/book/taxi/confirm?destination=${encodeURIComponent(place.destination)}`)}
                  className="w-full flex items-center gap-3 py-3 text-left"
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
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>{place.label}</p>
                    <p style={{ fontSize: 10, color: '#a8a8a8' }}>{place.address}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
