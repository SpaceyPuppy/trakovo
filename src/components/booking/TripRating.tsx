'use client'
import { useState } from 'react'

interface TripRatingProps {
  bookingId: string
  driverName: string
  driverInitials: string
  vehicleName: string
  maxStars?: number
  showComment?: boolean
  commentMaxLength?: number
  onSubmit: (rating: { stars: number; comment?: string }) => void
}

export default function TripRating({
  bookingId,
  driverName,
  driverInitials,
  vehicleName,
  maxStars = 5,
  showComment = false,
  commentMaxLength = 500,
  onSubmit,
}: TripRatingProps) {
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (stars === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/booking/${bookingId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to submit')
      }
      onSubmit({ stars, comment: comment.trim() || undefined })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const displayStars = hovered || stars

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-bg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate to-slate/80 flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
            {driverInitials}
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{driverName}</p>
            <p className="text-[12px] text-ink-3">{vehicleName}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Stars */}
        <div>
          <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Rate your trip</p>
          <div className="flex gap-1.5">
            {Array.from({ length: maxStars }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110 active:scale-95"
                aria-label={`${n} star`}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill={n <= displayStars ? '#d4570a' : 'none'} stroke={n <= displayStars ? '#d4570a' : '#d4d2cc'} strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        {showComment && (
          <div>
            <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2 block">
              Comment <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={commentMaxLength}
              placeholder={`Leave a comment for ${driverName.split(' ')[0]}…`}
              className="w-full border border-border rounded-[8px] px-3 py-2.5 text-[13px] text-ink bg-bg resize-none outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
              rows={3}
            />
          </div>
        )}

        {error && (
          <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={stars === 0 || submitting}
          className="w-full py-2.5 rounded-[8px] bg-slate text-white text-[13.5px] font-semibold transition-all hover:bg-slate/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {submitting ? 'Submitting…' : 'Submit & done'}
        </button>
      </div>
    </div>
  )
}
