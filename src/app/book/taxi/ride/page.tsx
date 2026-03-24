'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useServiceFeatures } from '@/lib/hooks/useServiceFeatures'

const MOCK_DRIVER = {
  name: 'Barry Thompson',
  initials: 'BT',
  vehicle: 'White Toyota Camry',
  rego: 'ABC-123',
}

// Simulated tracking map
function TrackingMap({ destination }: { destination: string }) {
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: '220px', background: '#e8e4dd', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 390 260" style={{ position: 'absolute', inset: 0 }}>
        <rect width="390" height="260" fill="#e8e4dd" />
        {/* Streets */}
        <rect x="0" y="60" width="390" height="8" fill="#d4d0c8" />
        <rect x="0" y="160" width="390" height="8" fill="#d4d0c8" />
        <rect x="90" y="0" width="8" height="260" fill="#d4d0c8" />
        <rect x="200" y="0" width="8" height="260" fill="#d4d0c8" />
        <rect x="310" y="0" width="8" height="260" fill="#d4d0c8" />
        {/* Buildings */}
        <rect x="102" y="10" width="30" height="42" rx="2" fill="#ccc8c0" />
        <rect x="142" y="10" width="46" height="42" rx="2" fill="#d4d0c8" />
        <rect x="212" y="10" width="36" height="42" rx="2" fill="#ccc8c0" />
        <rect x="102" y="70" width="40" height="82" rx="2" fill="#d4d0c8" />
        <rect x="150" y="70" width="38" height="82" rx="2" fill="#ccc8c0" />
        <rect x="212" y="70" width="40" height="82" rx="2" fill="#d4d0c8" />
        <rect x="260" y="70" width="38" height="82" rx="2" fill="#ccc8c0" />
        <rect x="102" y="170" width="36" height="76" rx="2" fill="#ccc8c0" />
        <rect x="148" y="170" width="46" height="76" rx="2" fill="#d4d0c8" />
        <rect x="212" y="170" width="36" height="76" rx="2" fill="#ccc8c0" />
        {/* Route line (solid) */}
        <path d="M 130 240 L 130 130 L 210 130 L 210 40 L 290 40" stroke="#d4570a" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Route glow */}
        <path d="M 130 240 L 130 130 L 210 130 L 210 40 L 290 40" stroke="#d4570a" strokeWidth="12" fill="none" opacity="0.04" strokeLinecap="round" />
        {/* Destination pin */}
        <rect x="280" y="30" width="20" height="20" rx="3" fill="#1e2330" />
        {/* Moving car marker */}
        <g transform="translate(130, 200)">
          <circle cx="0" cy="0" r="15" fill="#1e2330" stroke="white" strokeWidth="2.5"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          <text x="0" y="5" fontSize="10" fill="white" textAnchor="middle">🚗</text>
        </g>
      </svg>

      {/* ETA chip */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        background: 'white', borderRadius: 14, padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
        border: '0.5px solid rgba(0,0,0,0.06)',
      }}>
        <p style={{ fontSize: 9, color: '#717171', fontWeight: 500, letterSpacing: '0.1px' }}>Arriving in</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#141414' }}>4</span>
          <span style={{ fontSize: 11, color: '#717171', fontWeight: 500 }}>min</span>
        </div>
      </div>

      {/* Destination label */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        background: 'white', borderRadius: 8, padding: '3px 8px',
        fontSize: 10, fontWeight: 600, color: '#141414',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}>
        {destination}
      </div>
    </div>
  )
}

function RideContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = searchParams.get('destination') || 'Cohuna Hospital'
  const features = useServiceFeatures('taxi')
  const [progress, setProgress] = useState(20)

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 100))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  function completeRide() {
    router.push(`/book/taxi/complete?destination=${encodeURIComponent(destination)}`)
  }

  return (
    <div className="book-screen flex flex-col" style={{ minHeight: '100dvh', background: '#f7f6f3' }}>
      {/* Map area */}
      <TrackingMap destination={destination} />

      {/* Bottom sheet */}
      <div
        className="book-sheet"
        style={{
          background: 'white',
          borderRadius: '18px 18px 0 0',
          borderTop: '0.5px solid rgba(0,0,0,0.06)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          padding: '0 16px 32px',
          flex: 1,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 12 }}>
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0efe9', borderRadius: 9999, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #d4570a, #e87a3a)',
            borderRadius: 9999,
            transition: 'width 3s ease',
          }} />
        </div>

        {/* Driver info */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d3444, #1e2330)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', flexShrink: 0,
          }}>
            {MOCK_DRIVER.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>
              {MOCK_DRIVER.name.split(' ')[0]} is on the way
            </p>
            <p style={{ fontSize: 10, color: '#717171' }}>{MOCK_DRIVER.vehicle} · {MOCK_DRIVER.rego}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]"
            style={{ background: 'white', border: '0.5px solid #e2e0db', boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 6.54 6.54l1.62-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#3a3a3a' }}>Call</span>
          </button>
          <button
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]"
            style={{ background: 'white', border: '0.5px solid #e2e0db', boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#3a3a3a' }}>Msg</span>
          </button>
          {features.share_trip && (
            <button
              className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]"
              style={{
                flex: 1.3,
                background: 'linear-gradient(180deg, #e06520 0%, #c4540e 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 4px rgba(212,87,10,0.2), 0 6px 14px rgba(212,87,10,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'white' }}>Share</span>
            </button>
          )}
          {/* Complete ride button (MVP - simulates trip end) */}
          <button
            onClick={completeRide}
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]"
            style={{
              flex: 1.5,
              background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'white' }}>Complete</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RidePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#f7f6f3' }} />}>
      <RideContent />
    </Suspense>
  )
}
