'use client'
import { useState } from 'react'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'
const lbl = 'block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5'

const EVENT_TYPES = [
  'Executive / Airport Transfer',
  'Conference or Corporate Event',
  'Group / Delegation Transport',
  'Ongoing Account Arrangement',
  'Special Event or Function',
  'Community or Accessible Transport',
  'Other',
]

export default function CorporateEnquiryForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', organisation: '',
    event_type: '', guests: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email, and message.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/enquiry/corporate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-success-bg border border-success/30 rounded-xl px-8 py-10 text-center">
        <p className="text-[32px] mb-4">✓</p>
        <h3 className="font-display font-bold text-[18px] mb-2">Enquiry received</h3>
        <p className="text-[14px] text-ink-3 leading-[1.7]">
          Thanks for getting in touch. We'll review your enquiry and be back in touch within one business day.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 space-y-4">
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Full Name <span className="text-red-500">*</span></label>
          <input className={inp} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <label className={lbl}>Organisation</label>
          <input className={inp} type="text" value={form.organisation} onChange={e => set('organisation', e.target.value)} placeholder="Acme Corp" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Email <span className="text-red-500">*</span></label>
          <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@acmecorp.com" />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input className={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 4XX XXX XXX" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Type of Service</label>
          <select className={inp} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
            <option value="">— select —</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Approx. Guests / Passengers</label>
          <input className={inp} type="text" value={form.guests} onChange={e => set('guests', e.target.value)} placeholder="e.g. 12" />
        </div>
      </div>

      <div>
        <label className={lbl}>Message / Requirements <span className="text-red-500">*</span></label>
        <textarea
          className={`${inp} h-28 resize-none`}
          value={form.message}
          onChange={e => set('message', e.target.value)}
          placeholder="Tell us about your transport needs, dates, locations, or any specific requirements…"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-accent text-white font-display font-bold text-[14px] py-3 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send Enquiry →'}
      </button>

      <p className="text-[11.5px] text-ink-4 text-center">We'll respond within one business day.</p>
    </form>
  )
}
