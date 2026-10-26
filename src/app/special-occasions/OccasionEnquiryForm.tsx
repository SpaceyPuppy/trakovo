'use client'

import { useState } from 'react'
import { OCCASIONS } from '@/lib/special-occasions'

const inputClass = 'w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'
const labelClass = 'block text-[13px] font-semibold text-ink-2 mb-1.5'

export default function OccasionEnquiryForm({ vehicles, initialVehicleId }: {
  vehicles: { id: string; name: string }[]
  initialVehicleId: string
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', occasion: '', event_date: '', pickup: '', destination: '', passengers: '', vehicle_id: initialVehicleId, message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/enquiry/special-occasions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to send your enquiry. Please try again.')
      setSent(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to send your enquiry. Please try again.')
    } finally { setSending(false) }
  }

  if (sent) return <div role="status" className="rounded-xl border border-success/30 bg-success-bg p-8 text-center self-start">
    <h3 className="font-display font-bold text-[21px] mb-3">Your enquiry is with us.</h3>
    <p className="text-[14px] text-ink-3 leading-relaxed">Thank you for sharing your plans. Our team will be in touch to discuss vehicle options and arrangements.</p>
  </div>

  return <form onSubmit={submit} className="rounded-xl border border-border bg-white p-6 space-y-5">
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700 text-[14px]">{error}</p>}
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label htmlFor="occasion-name" className={labelClass}>Your name *</label><input id="occasion-name" autoComplete="name" required maxLength={191} value={form.name} onChange={event => update('name', event.target.value)} className={inputClass} /></div>
      <div><label htmlFor="occasion-phone" className={labelClass}>Phone</label><input id="occasion-phone" autoComplete="tel" type="tel" maxLength={80} value={form.phone} onChange={event => update('phone', event.target.value)} className={inputClass} /></div>
    </div>
    <div><label htmlFor="occasion-email" className={labelClass}>Email *</label><input id="occasion-email" autoComplete="email" type="email" required maxLength={191} value={form.email} onChange={event => update('email', event.target.value)} className={inputClass} /></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label htmlFor="occasion-type" className={labelClass}>Occasion *</label><select id="occasion-type" required value={form.occasion} onChange={event => update('occasion', event.target.value)} className={inputClass}><option value="">Select your occasion</option>{OCCASIONS.map(occasion => <option key={occasion.id} value={occasion.id}>{occasion.label}</option>)}<option value="corporate">Corporate Function or Event</option></select></div>
      <div><label htmlFor="occasion-date" className={labelClass}>Event date</label><input id="occasion-date" type="date" value={form.event_date} onChange={event => update('event_date', event.target.value)} className={inputClass} /></div>
      <div><label htmlFor="occasion-pickup" className={labelClass}>Pickup location</label><input id="occasion-pickup" maxLength={300} value={form.pickup} onChange={event => update('pickup', event.target.value)} className={inputClass} /></div>
      <div><label htmlFor="occasion-destination" className={labelClass}>Venue / destination</label><input id="occasion-destination" maxLength={300} value={form.destination} onChange={event => update('destination', event.target.value)} className={inputClass} /></div>
      <div><label htmlFor="occasion-passengers" className={labelClass}>Passengers</label><input id="occasion-passengers" type="number" min={1} max={1000} value={form.passengers} onChange={event => update('passengers', event.target.value)} className={inputClass} /></div>
      <div><label htmlFor="occasion-vehicle" className={labelClass}>Preferred vehicle</label><select id="occasion-vehicle" value={form.vehicle_id} onChange={event => update('vehicle_id', event.target.value)} className={inputClass}><option value="">Please suggest options</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></div>
    </div>
    <div><label htmlFor="occasion-message" className={labelClass}>Your plans and preferences *</label><textarea id="occasion-message" required maxLength={5000} rows={5} value={form.message} onChange={event => update('message', event.target.value)} placeholder="Tell us about your itinerary, timings or preferred style of vehicle…" className={inputClass} /></div>
    <div hidden aria-hidden="true"><label htmlFor="occasion-website">Website</label><input id="occasion-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update('website', event.target.value)} /></div>
    <button type="submit" disabled={sending} className="w-full rounded-md bg-accent px-5 py-3.5 text-white text-[14px] font-semibold hover:bg-accent-dark disabled:opacity-50">{sending ? 'Sending…' : 'Send Event Enquiry →'}</button>
    <p className="text-[12px] text-ink-4 text-center">Enquiries are subject to vehicle availability and confirmation.</p>
  </form>
}
