'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useServiceFeatures } from '@/lib/hooks/useServiceFeatures'

const TaxiMap = dynamic(() => import('@/components/book/TaxiMap'), { ssr: false })

const MOCK_DRIVER = { name: 'Barry Thompson', initials: 'BT', vehicle: 'White Toyota Camry', rego: 'ABC-123' }

function RideContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id') || ''
  const destName = searchParams.get('dest_name') || 'Destination'
  const initialDuration = parseInt(searchParams.get('duration_s') || '360')
  const distanceM = searchParams.get('distance_m') || ''
  const fareCents = searchParams.get('fare_cents') || ''

  const features = useServiceFeatures('taxi')
  const [remaining, setRemaining] = useState(initialDuration)
  const [completing, setCompleting] = useState(false)

  const progress = Math.min(100, Math.round((1 - remaining / initialDuration) * 100))

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 5)), 5000)
    return () => clearInterval(id)
  }, [remaining])

  async function completeRide() {
    setCompleting(true)
    if (bookingId) {
      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).catch(() => {})
    }
    const params = new URLSearchParams({ booking_id: bookingId, dest_name: destName })
    if (distanceM) params.set('distance_m', distanceM)
    if (fareCents) params.set('fare_cents', fareCents)
    if (initialDuration) params.set('duration_s', String(initialDuration))
    router.push(`/book/taxi/complete?${params}`)
  }

  const eta = remaining <= 0 ? 'Arrived' : remaining < 60 ? '< 1 min' : `${Math.ceil(remaining / 60)} min`

  return (
    <div className="flex flex-col lg:flex-row" style={{ minHeight: '100dvh' }}>
      {/* Map */}
      <div className="relative lg:flex-1" style={{ height: '55vh', minHeight: 280 }}>
        <TaxiMap style={{ width: '100%', height: '100%' }}>
          {/* ETA chip over map */}
          <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 9, color: '#717171', fontWeight: 500 }}>Arriving in</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#141414', lineHeight: 1 }}>{eta}</p>
          </div>
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, background: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#141414', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            {destName}
          </div>
        </TaxiMap>
      </div>

      {/* Bottom sheet */}
      <div
        className="bg-white lg:w-[400px] lg:h-screen lg:overflow-y-auto flex flex-col"
        style={{ borderRadius: '18px 18px 0 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}
      >
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 pt-2 pb-8 lg:pt-6 lg:px-6">
          {/* Progress bar */}
          <div style={{ height: 3, background: '#f0efe9', borderRadius: 9999, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #d4570a, #e87a3a)', borderRadius: 9999, transition: 'width 5s ease' }} />
          </div>

          {/* Driver info */}
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2d3444, #1e2330)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', flexShrink: 0 }}>
              {MOCK_DRIVER.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>{MOCK_DRIVER.name.split(' ')[0]} is on the way</p>
              <p style={{ fontSize: 10, color: '#717171' }}>{MOCK_DRIVER.vehicle} · {MOCK_DRIVER.rego}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Call */}
            <button className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]" style={{ background: 'white', border: '0.5px solid #e2e0db', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 6.54 6.54l1.62-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#3a3a3a' }}>Call</span>
            </button>
            {/* Msg */}
            <button className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]" style={{ background: 'white', border: '0.5px solid #e2e0db', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#3a3a3a' }}>Msg</span>
            </button>
            {/* Share (feature flagged) */}
            {features.share_trip && (
              <button className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97]" style={{ flex: 1.3, background: 'linear-gradient(180deg, #e06520 0%, #c4540e 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 4px rgba(212,87,10,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'white' }}>Share</span>
              </button>
            )}
            {/* Complete */}
            <button
              onClick={completeRide}
              disabled={completing}
              className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-3 transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ flex: 1.5, background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'white' }}>Complete</span>
            </button>
          </div>
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
