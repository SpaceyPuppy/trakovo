'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const publicId = searchParams.get('public_id') || ''
  const pickupName = searchParams.get('pickup_name') || 'Pickup'
  const destName = searchParams.get('dest_name') || 'Destination'
  const phone = searchParams.get('phone') || ''

  return (
    <div style={{ minHeight: '100dvh', background: '#f7f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Success icon + heading */}
        <div className="flex flex-col items-center" style={{ marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(22,163,74,0.05))',
            border: '1px solid rgba(22,163,74,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#141414', marginBottom: 6, textAlign: 'center' }}>
            Booking received
          </h1>
          <p style={{ fontSize: 13, color: '#717171', textAlign: 'center', lineHeight: 1.5 }}>
            {phone
              ? <>We'll call or text <strong style={{ color: '#3a3a3a' }}>{phone}</strong> to confirm your taxi.</>
              : "We'll be in touch shortly to confirm your taxi."}
          </p>
        </div>

        {/* Booking details card */}
        <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e2e0db', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 16 }}>
          {/* Trip route */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #eeece8' }}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
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

          {/* Booking ref */}
          {publicId && (
            <div className="flex items-center justify-between" style={{ padding: '10px 16px' }}>
              <span style={{ fontSize: 11, color: '#9a9894' }}>Booking reference</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#141414', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{publicId}</span>
            </div>
          )}
        </div>

        {/* Info note */}
        <div style={{ background: '#fefce8', border: '0.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>
            This is a booking request. A dispatcher will confirm your ride and provide a pickup time.
          </p>
        </div>

        {/* Done button */}
        <button
          onClick={() => router.push('/book')}
          className="w-full flex items-center justify-center rounded-[12px] font-semibold transition-all active:scale-[0.97]"
          style={{
            height: 50, fontSize: 14,
            background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#f7f6f3' }} />}>
      <CompleteContent />
    </Suspense>
  )
}
