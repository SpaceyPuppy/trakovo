'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Enquiry {
  id: string
  public_id: string
  subject: string
  message: string
  status: string
  staff_reply: string | null
  booking_id: string | null
  client_id: string | null
  created_at: string
}

interface Booking {
  id: string
  public_id: string
}

interface Client {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  resolved: 'bg-success-bg text-success border-success/30',
}

export default function VendorSupportPage() {
  const searchParams = useSearchParams()
  const prefillBookingId = searchParams.get('booking') ?? ''

  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [bookingId, setBookingId] = useState(prefillBookingId)
  const [clientId, setClientId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/support').then(r => r.json()),
      fetch('/api/vendor/bookings').then(r => r.json()),
      fetch('/api/vendor/clients').then(r => r.json()),
    ]).then(([s, b, c]) => {
      setEnquiries(s.enquiries ?? [])
      // Most recent 10 bookings
      setRecentBookings((b.bookings ?? []).slice(0, 10).map((bk: { id: string; public_id: string }) => ({ id: bk.id, public_id: bk.public_id })))
      setClients((c.clients ?? []).map((cl: { id: string; name: string }) => ({ id: cl.id, name: cl.name })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) { setSubmitError('Subject and message are required.'); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload: Record<string, string> = { subject, message }
      if (bookingId) payload.booking_id = bookingId
      if (clientId) payload.client_id = clientId
      const res = await fetch('/api/vendor/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to submit.'); return }
      // Refresh enquiries list
      setEnquiries(prev => [data.enquiry, ...prev])
      setSubject('')
      setMessage('')
      setBookingId('')
      setClientId('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:border-accent bg-white'
  const lbl = 'block text-[12px] font-semibold text-ink-3 mb-1'

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Support</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Send an enquiry to our team or view previous messages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* New enquiry form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-display font-bold text-[15px] mb-4">New Enquiry</h2>

            {submitted && (
              <div className="bg-success-bg border border-success/30 text-success text-[13px] px-4 py-3 rounded-[6px] mb-4">
                Enquiry submitted. We&apos;ll get back to you shortly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={lbl}>Subject *</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  className={inp} placeholder="Brief description of your query" required />
              </div>
              <div>
                <label className={lbl}>Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={5} className={inp} placeholder="Describe your query in detail…" required />
              </div>
              <div>
                <label className={lbl}>Related booking (optional)</label>
                <select value={bookingId} onChange={e => setBookingId(e.target.value)} className={inp}>
                  <option value="">— none —</option>
                  {recentBookings.map(b => (
                    <option key={b.id} value={b.id}>{b.public_id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Related client (optional)</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className={inp}>
                  <option value="">— none —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-[6px]">
                  {submitError}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-accent text-white font-semibold text-[13.5px] py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-60 transition-colors">
                {submitting ? 'Sending…' : 'Send Enquiry'}
              </button>
            </form>
          </div>
        </div>

        {/* Past enquiries */}
        <div className="lg:col-span-2">
          <h2 className="font-display font-bold text-[15px] mb-4">Your Enquiries</h2>

          {loading ? (
            <div className="bg-white border border-border rounded-xl px-8 py-12 text-center">
              <p className="text-ink-3 text-[14px]">Loading…</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="bg-white border border-border rounded-xl px-8 py-12 text-center">
              <p className="text-ink-3 text-[14px]">No enquiries yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map(enq => (
                <div key={enq.id} className="bg-white border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-[14px] text-ink">{enq.subject}</p>
                      <p className="text-[11.5px] text-ink-4 mt-0.5 font-mono">{enq.public_id} · {new Date(enq.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[enq.status] ?? 'bg-bg text-ink-3 border-border'}`}>
                      {enq.status}
                    </span>
                  </div>

                  <p className="text-[13.5px] text-ink-3 whitespace-pre-line">{enq.message}</p>

                  {(enq.booking_id || enq.client_id) && (
                    <div className="flex gap-3 mt-2">
                      {enq.booking_id && (
                        <a href={`/vendor/bookings/${enq.booking_id}`} className="text-[12px] text-accent hover:underline">
                          View booking →
                        </a>
                      )}
                      {enq.client_id && (
                        <a href={`/vendor/clients/${enq.client_id}`} className="text-[12px] text-accent hover:underline">
                          View client →
                        </a>
                      )}
                    </div>
                  )}

                  {enq.staff_reply && (
                    <div className="mt-3 border-l-4 border-accent pl-4 bg-accent-bg/30 rounded-r-[6px] py-3 pr-3">
                      <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">Staff reply</p>
                      <p className="text-[13.5px] text-ink whitespace-pre-line">{enq.staff_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
