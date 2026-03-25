'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useServiceFeatures } from '@/lib/hooks/useServiceFeatures'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} className="transition-transform hover:scale-110 active:scale-95">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={n <= display ? '#d4570a' : 'none'} stroke={n <= display ? '#d4570a' : '#d4d2cc'} strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function CompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id') || ''
  const features = useServiceFeatures('taxi')

  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)

  // Trip data passed via URL params
  const distanceM = parseFloat(searchParams.get('distance_m') || '0')
  const durationS = parseInt(searchParams.get('duration_s') || '0')
  const destination = searchParams.get('dest_name') || 'Destination'

  const distance = distanceM > 0 ? `${(distanceM / 1000).toFixed(1)} km` : '—'
  const duration = durationS > 0 ? `${Math.round(durationS / 60)} min` : '—'

  async function handleDone() {
    if (features.rating && stars > 0 && !submitted && bookingId) {
      try {
        const res = await fetch(`/api/booking/${bookingId}/rating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stars, comment: comment || undefined }),
        })
        if (!res.ok) {
          const d = await res.json()
          setRatingError(d.error || 'Rating failed')
          return
        }
        setSubmitted(true)
      } catch {
        setRatingError('Something went wrong')
        return
      }
    }
    router.push('/book')
  }

  const showRating = features.rating
  const showComment = features.rating && features.rating_comment
  const hasRating = stars > 0 || !showRating

  return (
    <div className="flex flex-col px-4 pt-8 pb-10" style={{ minHeight: '100dvh', background: '#f7f6f3', maxWidth: 480, margin: '0 auto' }}>
      {/* Success icon */}
      <div className="flex flex-col items-center mb-6">
        <div style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: 12, background: 'linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.06))', border: '1px solid rgba(29,158,117,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a6645" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#141414', marginBottom: 4 }}>Trip complete</h1>
        <p style={{ fontSize: 11, color: '#717171' }}>{destination}</p>
      </div>

      {/* Trip summary card */}
      <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e2e0db', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16, overflow: 'hidden' }}>
        {/* Stats */}
        <div className="flex" style={{ borderBottom: showRating ? '0.5px solid #eeece8' : 'none' }}>
          {[
            { label: 'Distance', value: distance },
            { label: 'Duration', value: duration },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 flex flex-col items-center py-4" style={{ borderLeft: i > 0 ? '0.5px solid #eeece8' : 'none' }}>
              <p style={{ fontSize: 9, color: '#717171', letterSpacing: '0.05px', marginBottom: 3 }}>{stat.label}</p>
              <p style={{ fontWeight: 500, fontSize: 13, color: '#141414' }}>{stat.value}</p>
            </div>
          ))}
        </div>
        {/* Rating row */}
        {showRating && (
          <div className="flex items-center justify-between px-4 py-3">
            <p style={{ fontSize: 11, color: '#717171' }}>Rate your trip</p>
            <StarRating value={stars} onChange={setStars} />
          </div>
        )}
      </div>

      {/* Comment (feature flagged) */}
      {showComment && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            placeholder="Leave a comment about your trip…"
            style={{ width: '100%', background: '#f7f6f3', border: '0.5px solid #e2e0db', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#141414', resize: 'none', outline: 'none', height: 48, fontFamily: 'Epilogue, sans-serif' }}
          />
        </div>
      )}

      {ratingError && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 8 }}>{ratingError}</p>}

      <button
        onClick={handleDone}
        disabled={showRating && !hasRating}
        className="w-full flex items-center justify-center rounded-[12px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
        style={{ height: 50, fontSize: 14, background: 'linear-gradient(180deg, #252c3e 0%, #1a2030 100%)', color: 'white', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1)' }}
      >
        {showRating ? 'Submit & done' : 'Done'}
      </button>
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
