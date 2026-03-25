'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useRoute } from '@/lib/hooks/useRoute'

const TaxiMap = dynamic(() => import('@/components/book/TaxiMap'), { ssr: false })

function formatDuration(s: number): string {
  const mins = Math.round(s / 60)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`
  return `${(m / 1000).toFixed(1)} km`
}

const TAXI_BASES = [
  { name: 'Cohuna Taxi', lat: -35.8729, lng: 144.3194 },
  { name: 'Kerang Taxi', lat: -35.7258, lng: 143.9194 },
  { name: 'Koondrook Taxi', lat: -35.6400, lng: 144.1200 },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestTaxi(lat: number, lng: number) {
  return TAXI_BASES.reduce((best, base) =>
    haversineKm(lat, lng, base.lat, base.lng) < haversineKm(lat, lng, best.lat, best.lng) ? base : best
  )
}

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pickupName = searchParams.get('pickup_name') || 'Current location'
  const pickupLat = parseFloat(searchParams.get('pickup_lat') || '-35.8729')
  const pickupLng = parseFloat(searchParams.get('pickup_lng') || '144.3194')
  const destName = searchParams.get('dest_name') || 'Destination'
  const destLat = parseFloat(searchParams.get('dest_lat') || '-35.8729')
  const destLng = parseFloat(searchParams.get('dest_lng') || '144.3194')

  const pickup: [number, number] = [pickupLng, pickupLat]
  const dest: [number, number] = [destLng, destLat]

  const { route, loading: routeLoading } = useRoute(pickup, dest)
  const taxi = nearestTaxi(pickupLat, pickupLng)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!name.trim() || !phone.trim() || !route) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/booking/taxi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: name.trim(),
          contact_phone: phone.trim(),
          pickup_address: pickupName,
          dest_address: destName,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          dest_lat: destLat,
          dest_lng: destLng,
          distance_m: route.distance_m,
          duration_s: route.duration_s,
          fare_cents: route.fare_cents,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      const rideParams = new URLSearchParams({
        booking_id: data.booking_id,
        dest_name: destName,
        duration_s: String(Math.round(route.duration_s)),
        distance_m: String(Math.round(route.distance_m)),
        fare_cents: String(route.fare_cents),
      })
      router.push(`/book/taxi/ride?${rideParams}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const canConfirm = name.trim().length > 1 && phone.trim().length > 5 && !!route && !submitting

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen" style={{ minHeight: '100dvh' }}>
      {/* Map */}
      <div className="relative lg:flex-1 h-[40vh] lg:h-full">
        <TaxiMap
          pickup={pickup}
          dest={dest}
          routeGeometry={route?.geometry ?? null}
          style={{ width: '100%', height: '100%' }}
        />
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center justify-center rounded-full bg-white shadow-md transition-all active:scale-95"
          style={{ width: 36, height: 36, border: '0.5px solid rgba(0,0,0,0.08)', zIndex: 10 }}
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Panel */}
      <div
        className="bg-white lg:w-[400px] lg:h-screen lg:overflow-y-auto flex flex-col"
        style={{ borderRadius: '18px 18px 0 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 pt-4 pb-8 lg:pt-8 lg:px-6 flex flex-col gap-4">
          {/* Route summary */}
          <div style={{ background: '#f7f6f3', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #e2e0db' }}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4570a' }} />
                <div style={{ width: 1, height: 18, background: '#d4d2cc' }} />
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1e2330' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 500, color: '#141414', marginBottom: 10 }}>{pickupName}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#141414' }}>{destName}</p>
              </div>
            </div>
          </div>

          {/* Distance / ETA */}
          {routeLoading ? (
            <div className="flex items-center gap-2 py-2" style={{ color: '#9a9894', fontSize: 12 }}>
              <div style={{ width: 14, height: 14, border: '2px solid #e2e0db', borderTopColor: '#d4570a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Calculating route…
            </div>
          ) : route ? (
            <div className="flex gap-3">
              {[
                { label: 'Distance', value: formatDistance(route.distance_m) },
                { label: 'ETA', value: formatDuration(route.duration_s) },
              ].map(stat => (
                <div key={stat.label} className="flex-1 flex flex-col items-center py-3 rounded-[10px]" style={{ background: '#f7f6f3', border: '0.5px solid #e2e0db' }}>
                  <p style={{ fontSize: 9, color: '#9a9894', letterSpacing: '0.05px', marginBottom: 3 }}>{stat.label}</p>
                  <p style={{ fontWeight: 500, fontSize: 13, color: '#141414' }}>{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Contact form */}
          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-[10px] px-3 text-[13px] outline-none"
              style={{ height: 44, background: '#f7f6f3', border: '0.5px solid #e2e0db', color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              className="w-full rounded-[10px] px-3 text-[13px] outline-none"
              style={{ height: 44, background: '#f7f6f3', border: '0.5px solid #e2e0db', color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
            />
          </div>

          {/* Nearest taxi info */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-[10px]" style={{ background: '#f7f6f3', border: '0.5px solid #e2e0db' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2d3444, #1e2330)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 4v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 12, fontWeight: 500, color: '#141414' }}>{taxi.name}</p>
              <p style={{ fontSize: 10, color: '#9a9894' }}>Nearest taxi to your location</p>
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: '#c0392b' }}>{error}</p>}

          {/* Action buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => router.back()}
              className="flex-1 flex items-center justify-center rounded-[12px] font-medium transition-all active:scale-[0.97]"
              style={{ height: 50, fontSize: 14, background: '#f0efe9', color: '#3a3a3a', border: '0.5px solid #e2e0db' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-[2] flex items-center justify-center rounded-[12px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                height: 50, fontSize: 14,
                background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)',
              }}
            >
              {submitting ? 'Booking…' : 'Confirm ride'}
            </button>
          </div>
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
