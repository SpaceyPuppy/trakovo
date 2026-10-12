'use client'

import { useState } from 'react'
import type { TaxiBookingConfig } from '@/lib/taxi-booking-config'

export default function TaxiBookingSettings({ initial }: { initial: TaxiBookingConfig }) {
  const [phone, setPhone] = useState(initial.phone)
  const [online, setOnline] = useState(initial.onlineBookingEnabled)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  return (
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault()
      setSaving(true)
      setMessage('')
      setError('')
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxi_booking_phone: phone.trim(), taxi_online_booking_enabled: online ? '1' : '0' }),
        })
        if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to save taxi settings')
        setMessage('Taxi booking settings saved. Changes apply when customers next open or refresh the site.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save taxi settings')
      } finally { setSaving(false) }
    }}>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-ink-3">Taxi booking phone number</span>
        <input type="tel" required maxLength={40} value={phone} onChange={event => setPhone(event.target.value)}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-ink" placeholder="e.g. 03 1234 5678" />
      </label>
      <label className="flex items-start gap-3 text-[14px] text-ink">
        <input type="checkbox" checked={online} onChange={event => setOnline(event.target.checked)} className="mt-1 accent-accent" />
        <span><strong>Enable online taxi bookings</strong><span className="mt-1 block text-[13px] text-ink-3">Leave off to show the call-to-book dialog. Turn on when you are ready to launch the online taxi app.</span></span>
      </label>
      {message && <p role="status" className="text-[13px] text-success">{message}</p>}
      {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-md bg-accent px-5 py-2.5 text-[13px] font-bold text-white hover:bg-accent-dark disabled:opacity-50">
        {saving ? 'Saving…' : 'Save taxi settings'}
      </button>
    </form>
  )
}
