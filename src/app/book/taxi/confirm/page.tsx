'use client'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Simple SVG route map (pickup → destination dashed line)
function RouteMap({ destination }: { destination: string }) {
  return (
    <div style={{ position: 'relative', height: '200px', background: '#e8e4dd', overflow: 'hidden' }}>
      {/* Street grid */}
      <svg width="100%" height="100%" viewBox="0 0 390 200" style={{ position: 'absolute', inset: 0 }}>
        <rect width="390" height="200" fill="#e8e4dd" />
        <rect x="0" y="50" width="390" height="8" fill="#d4d0c8" />
        <rect x="0" y="130" width="390" height="8" fill="#d4d0c8" />
        <rect x="80" y="0" width="8" height="200" fill="#d4d0c8" />
        <rect x="200" y="0" width="8" height="200" fill="#d4d0c8" />
        <rect x="310" y="0" width="8" height="200" fill="#d4d0c8" />
        {/* Buildings */}
        <rect x="92" y="10" width="28" height="32" rx="2" fill="#ccc8c0" />
        <rect x="130" y="10" width="40" height="32" rx="2" fill="#d4d0c8" />
        <rect x="212" y="10" width="30" height="32" rx="2" fill="#ccc8c0" />
        <rect x="92" y="62" width="36" height="60" rx="2" fill="#d4d0c8" />
        <rect x="140" y="62" width="40" height="60" rx="2" fill="#ccc8c0" />
        <rect x="212" y="62" width="30" height="60" rx="2" fill="#d4d0c8" />
        <rect x="260" y="62" width="38" height="60" rx="2" fill="#ccc8c0" />
        <rect x="92" y="140" width="28" height="50" rx="2" fill="#ccc8c0" />
        <rect x="130" y="140" width="44" height="50" rx="2" fill="#d4d0c8" />
        <rect x="212" y="140" width="30" height="50" rx="2" fill="#ccc8c0" />
        {/* Dashed route line */}
        <path d="M 110 180 L 110 100 L 200 100 L 200 30 L 280 30" stroke="#d4570a" strokeWidth="3.5" strokeDasharray="6,5" fill="none" opacity="0.8" strokeLinecap="round" />
        {/* Route glow */}
        <path d="M 110 180 L 110 100 L 200 100 L 200 30 L 280 30" stroke="#d4570a" strokeWidth="10" fill="none" opacity="0.06" strokeLinecap="round" />
        {/* Pickup pin (orange) */}
        <circle cx="110" cy="182" r="8" fill="#d4570a" stroke="white" strokeWidth="2.5" />
        {/* Destination pin (dark square) */}
        <rect x="272" y="22" width="16" height="16" rx="3" fill="#1e2330" />
      </svg>
      {/* Destination label */}
      <div style={{ position: 'absolute', top: 12, right: 40, background: 'white', borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#141414', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        {destination}
      </div>
    </div>
  )
}

const MOCK_DRIVER = {
  name: 'Barry Thompson',
  initials: 'BT',
  vehicle: 'White Toyota Camry',
  rego: 'ABC-123',
  rating: '4.8',
}

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = searchParams.get('destination') || 'Cohuna Hospital'
  const fare = '$12–18'
  const eta = '4 min'

  function confirmRide() {
    router.push(`/book/taxi/ride?destination=${encodeURIComponent(destination)}`)
  }

  function cancel() {
    router.back()
  }

  return (
    <div className="book-screen flex flex-col" style={{ minHeight: '100dvh', background: '#f7f6f3' }}>
      {/* Map area */}
      <RouteMap destination={destination} />

      {/* Bottom sheet */}
      <div
        className="book-sheet flex-1"
        style={{
          background: 'white',
          borderRadius: '18px 18px 0 0',
          borderTop: '0.5px solid rgba(0,0,0,0.06)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          padding: '0 16px 32px',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 16 }}>
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        {/* Destination + fare row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#141414' }}>{destination}</p>
            <p style={{ fontSize: 10, color: '#717171', marginTop: 1 }}>{eta} away · ~2.4 km</p>
          </div>
          <div style={{
            background: '#f7f6f3', borderRadius: 10, padding: '6px 12px',
            border: '0.5px solid #e2e0db',
          }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#141414', lineHeight: 1.1 }}>{fare}</p>
            <p style={{ fontSize: 8, color: '#a8a8a8', textAlign: 'center' }}>est. fare</p>
          </div>
        </div>

        {/* Driver card */}
        <div style={{
          background: '#f7f6f3', borderRadius: 12,
          border: '0.5px solid #e2e0db',
          padding: '12px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16,
        }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d3444, #1e2330)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}>
            {MOCK_DRIVER.initials}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>{MOCK_DRIVER.name}</p>
              {/* Rating pill */}
              <div style={{
                background: 'rgba(212,87,10,0.08)', borderRadius: 9999,
                padding: '1px 6px',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#d4570a">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#d4570a' }}>{MOCK_DRIVER.rating}</span>
              </div>
            </div>
            <p style={{ fontSize: 10, color: '#717171' }}>{MOCK_DRIVER.vehicle} · {MOCK_DRIVER.rego}</p>
          </div>
          {/* Phone button */}
          <button style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'white', border: '0.5px solid #e2e0db',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#717171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 6.54 6.54l1.62-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={cancel}
            className="flex-1 flex items-center justify-center rounded-[12px] text-[12px] font-medium transition-all active:scale-[0.97]"
            style={{
              height: 46,
              background: 'white', color: '#3a3a3a',
              border: '1px solid #e2e0db',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmRide}
            className="flex items-center justify-center rounded-[12px] font-semibold transition-all active:scale-[0.97]"
            style={{
              flex: 2, height: 46,
              background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
              color: 'white', fontSize: 13,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            Confirm ride
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#f7f6f3' }} />}>
      <ConfirmContent />
    </Suspense>
  )
}
