'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-success-bg text-success border-success/30',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

type Note = { id: string; text: string; author: string; created_at: string }
type TripLeg = { date: string; pickup: string; dropoff: string; pickupTime: string; dropoffTime: string }
type Booking = {
  id: string; public_id: string; status: string; start_date: string; end_date: string
  total_days: number; hire_type: string; contact_name: string | null; contact_email: string; contact_phone: string
  trip_details: string | null
  vehicle_name: string | null; notes: Note[]
}

export default function DriverBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const res = await fetch(`/api/driver/bookings/${id}`)
    if (res.status === 401) { router.push('/driver/login'); return }
    if (res.ok) setBooking(await res.json())
  }

  useEffect(() => { load() }, [id])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSubmitting(true)
    await fetch(`/api/driver/bookings/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText }),
    })
    setNoteText('')
    await load()
    setSubmitting(false)
  }

  if (!booking) return <div className="px-10 py-10 text-ink-3 text-[14px]">Loading…</div>

  const tripLegs: TripLeg[] = (() => {
    try { return booking.trip_details ? JSON.parse(booking.trip_details) : [] }
    catch { return [] }
  })()

  const row = (label: string, value: string | null | undefined) => (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0 text-[13.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <Link href="/driver/bookings" className="text-[13px] text-ink-3 hover:text-accent transition-colors">← Bookings</Link>
          <h1 className="font-display font-bold text-[26px] tracking-tight font-mono mt-1">{booking.public_id}</h1>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold border ${STATUS_COLORS[booking.status] ?? 'bg-bg text-ink-3 border-border'}`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Trip Details</p>
          {row('Vehicle', booking.vehicle_name)}
          {row('Start Date', booking.start_date)}
          {row('End Date', booking.end_date)}
          {row('Duration', `${booking.total_days} day${booking.total_days !== 1 ? 's' : ''}`)}
          {row('Type', booking.hire_type === 'chauffeured' ? 'Chauffeured' : 'Self-Drive')}
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-3">Passenger</p>
          {row('Name', booking.contact_name)}
          {row('Email', booking.contact_email)}
          {row('Phone', booking.contact_phone)}
        </div>
      </div>

      {/* Trip schedule (chauffeured bookings) */}
      {tripLegs.length > 0 && (
        <div className="bg-white border border-border rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3.5 bg-bg border-b border-border">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">Schedule</p>
          </div>
          <div className="divide-y divide-border">
            {tripLegs.map((leg, i) => (
              <div key={i} className="px-5 py-4 text-[13.5px]">
                <p className="font-semibold text-ink mb-2">{leg.date || `Leg ${i + 1}`}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-3">
                  <div>
                    <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider block mb-0.5">Pickup</span>
                    <span className="font-medium text-ink">{leg.pickup || '—'}</span>
                    {leg.pickupTime && <span className="text-ink-3 ml-2 text-[12px]">@ {leg.pickupTime}</span>}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider block mb-0.5">Dropoff</span>
                    <span className="font-medium text-ink">{leg.dropoff || '—'}</span>
                    {leg.dropoffTime && <span className="text-ink-3 ml-2 text-[12px]">@ {leg.dropoffTime}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal notes */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-bg border-b border-border">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">Internal Notes</p>
        </div>
        <div className="divide-y divide-border">
          {booking.notes.length === 0 && (
            <p className="px-5 py-4 text-[13.5px] text-ink-4">No notes yet.</p>
          )}
          {booking.notes.map(n => (
            <div key={n.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-ink-3">{n.author}</span>
                <span className="text-[11px] text-ink-4">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[13.5px] text-ink whitespace-pre-wrap">{n.text}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-border bg-bg/50">
          <form onSubmit={addNote} className="flex gap-3">
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add an internal note…"
              className="flex-1 border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              required
            />
            <button type="submit" disabled={submitting}
              className="bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
              {submitting ? 'Adding…' : 'Add Note'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
