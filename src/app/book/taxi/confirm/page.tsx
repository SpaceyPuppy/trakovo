'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const TaxiMap = dynamic(() => import('@/components/book/TaxiMap'), { ssr: false })

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

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!name.trim() || !phone.trim()) return
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      const params = new URLSearchParams({
        booking_id: data.booking_id,
        public_id: data.public_id || '',
        pickup_name: pickupName,
        dest_name: destName,
        phone: phone.trim(),
      })
      router.push(`/book/taxi/complete?${params}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const canConfirm = name.trim().length > 1 && phone.trim().length > 5 && !submitting

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen" style={{ minHeight: '100dvh' }}>
      {/* Map */}
      <div className="relative lg:flex-1 h-[40vh] lg:h-full">
        <TaxiMap pickup={pickup} dest={dest} style={{ width: '100%', height: '100%' }} />
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
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <div style={{ width: 32, height: 3.5, background: '#e2e0db', borderRadius: 9999 }} />
        </div>

        <div className="px-4 pt-4 pb-8 lg:pt-8 lg:px-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display font-bold text-[19px] tracking-tight" style={{ color: '#141414' }}>Confirm booking</h2>
            <p style={{ fontSize: 12, color: '#9a9894', marginTop: 2 }}>We'll contact you shortly to confirm your ride.</p>
          </div>

          {/* Route summary */}
          <div style={{ background: '#f7f6f3', borderRadius: 12, padding: '12px 14px', border: '0.5px solid #e2e0db' }}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4570a' }} />
                <div style={{ width: 1, height: 16, background: '#d4d2cc' }} />
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1e2330' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 500, color: '#141414', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickupName}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#141414', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destName}</p>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="flex flex-col gap-2">
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9a9894', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your details</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-[10px] px-3 text-[13px] outline-none"
              style={{ height: 44, background: '#f7f6f3', border: '0.5px solid #e2e0db', color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Mobile number"
              type="tel"
              className="w-full rounded-[10px] px-3 text-[13px] outline-none"
              style={{ height: 44, background: '#f7f6f3', border: '0.5px solid #e2e0db', color: '#141414', fontFamily: 'Epilogue, sans-serif' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => router.back()}
              className="flex-1 flex items-center justify-center rounded-[12px] font-medium transition-all active:scale-[0.97]"
              style={{ height: 50, fontSize: 14, background: '#f0efe9', color: '#3a3a3a', border: '0.5px solid #e2e0db' }}
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-[2] flex items-center justify-center gap-2 rounded-[12px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                height: 50, fontSize: 14,
                background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)',
              }}
            >
              {submitting ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Sending…
                </>
              ) : 'Request taxi'}
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
