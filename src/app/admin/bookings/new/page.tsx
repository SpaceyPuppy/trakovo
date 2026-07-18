'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDailyRate } from '@/lib/utils'

interface Vehicle {
  id: string
  name: string
  price: number
  chauffeur_price: number
  hire_modes: string
  day_rates: Array<{ days_from: number; days_to: number | null; price: number; chauffeur_price: number }>
}

interface Vendor {
  id: string
  name: string
  contact_email: string
  contact_phone: string
}

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'
const lbl = 'block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1'

function calcDays(start: string, end: string) {
  if (!start || !end || end < start) return 0
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

export default function AdminNewBookingPage() {
  const router = useRouter()
  const idempotencyKey = useRef<string | null>(null)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [serviceType, setServiceType] = useState<'vehicle' | 'taxi' | 'cpv'>('vehicle')
  const [vehicleId, setVehicleId] = useState('')
  const [hireType, setHireType] = useState<'chauffeured' | 'dry-hire'>('chauffeured')
  const [status, setStatus] = useState('confirmed')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [rateOverride, setRateOverride] = useState('')
  const [notes, setNotes] = useState('')

  // Keep the key across a network retry, but use a new key if staff alter the
  // logical request before submitting again.
  useEffect(() => {
    idempotencyKey.current = null
  }, [
    serviceType, vehicleId, hireType, status, startDate, endDate, vendorId,
    contactName, contactEmail, contactPhone, rateOverride, notes,
  ])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/vehicles').then(r => r.json()),
      fetch('/api/admin/vendors').then(r => r.json()),
    ]).then(([vData, vendorData]) => {
      setVehicles(
        (vData as (Vehicle & { day_rates: unknown; is_available?: boolean })[])
          .filter(v => v.is_available !== false)
          .map(v => ({
            ...v,
            day_rates: typeof v.day_rates === 'string'
              ? (v.day_rates ? JSON.parse(v.day_rates) : [])
              : (Array.isArray(v.day_rates) ? v.day_rates : []),
          }))
      )
      setVendors((vendorData.vendors ?? []).filter((v: Vendor & { is_active: boolean }) => v.is_active))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleVendorChange(id: string) {
    setVendorId(id)
    if (id) {
      const v = vendors.find(v => v.id === id)
      if (v) {
        if (v.contact_email) setContactEmail(v.contact_email)
        if (v.contact_phone) setContactPhone(v.contact_phone)
      }
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === vehicleId) ?? null
  const days = calcDays(startDate, endDate)
  const isDual = selectedVehicle?.hire_modes === 'both'

  // Auto-calculated rate
  const autoRate = selectedVehicle && days > 0
    ? getDailyRate(selectedVehicle, hireType, days) / 100
    : 0
  const displayRate = rateOverride !== '' ? parseFloat(rateOverride) || 0 : autoRate
  const total = displayRate * days

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactEmail || !contactPhone || !startDate || !endDate) {
      setError('Start date, end date, email and phone are required.')
      return
    }
    setSaving(true); setError(null)
    try {
      idempotencyKey.current ??= crypto.randomUUID()
      const payload: Record<string, unknown> = {
        service_type: serviceType,
        hire_type: hireType,
        start_date: startDate,
        end_date: endDate,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        status,
        notes: notes || undefined,
      }
      if (serviceType === 'vehicle' && vehicleId) payload.vehicle_id = vehicleId
      if (rateOverride !== '') payload.daily_rate_override = parseFloat(rateOverride) || 0
      if (vendorId) payload.vendor_id = vendorId

      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create booking')
      }
      router.push(`/admin/bookings/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  return (
    <div className="px-10 py-10 max-w-[820px]">
      <a href="/admin/bookings" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">← Back to Bookings</a>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Quick Add Booking</h1>
      <p className="text-[14px] text-ink-3 mb-8">Create a booking directly — use for phone or walk-in requests.</p>

      {loading ? (
        <p className="text-[14px] text-ink-3">Loading vehicles…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>}

          {/* Service type */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="font-display font-bold text-[14px]">Service</p>
            <div className="grid grid-cols-3 gap-3">
              {([['vehicle', '🚗', 'Vehicle Hire'], ['taxi', '🚕', 'Taxi (metered)'], ['cpv', '🚘', 'CPV']] as const).map(([type, icon, label]) => (
                <button key={type} type="button" onClick={() => setServiceType(type)}
                  className={`border-2 rounded-[8px] px-4 py-3 text-left transition-all ${serviceType === type ? 'border-accent bg-accent-bg' : 'border-border hover:border-ink-3'}`}>
                  <span className="text-xl">{icon}</span>
                  <p className={`font-semibold text-[13px] mt-1 ${serviceType === type ? 'text-accent-dark' : 'text-ink'}`}>{label}</p>
                </button>
              ))}
            </div>

            {serviceType === 'vehicle' && (
              <>
                <div>
                  <label className={lbl}>Vehicle</label>
                  <select className={inp} value={vehicleId} onChange={e => { setVehicleId(e.target.value); setRateOverride('') }}>
                    <option value="">— no specific vehicle —</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                {isDual && (
                  <div>
                    <label className={lbl}>Hire Type</label>
                    <div className="flex gap-3">
                      {([['chauffeured', 'Chauffeured'], ['dry-hire', 'Self-Drive (Dry Hire)']] as const).map(([type, label]) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="hireType" value={type} checked={hireType === type} onChange={() => { setHireType(type); setRateOverride('') }} className="accent-accent" />
                          <span className="text-[13.5px]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="font-display font-bold text-[14px]">Dates</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Start Date *</label>
                <input type="date" required className={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>End Date *</label>
                <input type="date" required min={startDate} className={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            {days > 0 && <p className="text-[12.5px] text-ink-3">{days} day{days !== 1 ? 's' : ''}</p>}
          </div>

          {/* Vendor */}
          {vendors.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-5 space-y-2">
              <p className="font-display font-bold text-[14px]">Vendor <span className="text-ink-4 font-normal text-[13px]">(optional)</span></p>
              <select className={inp} value={vendorId} onChange={e => handleVendorChange(e.target.value)}>
                <option value="">— No vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <p className="text-[11.5px] text-ink-4">Selecting a vendor pre-fills contact details and tags this booking to their account.</p>
            </div>
          )}

          {/* Customer */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="font-display font-bold text-[14px]">Customer</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Full Name</label>
                <input type="text" className={inp} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label className={lbl}>Email *</label>
                <input type="email" required className={inp} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div>
                <label className={lbl}>Phone *</label>
                <input type="tel" required className={inp} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+61 4XX XXX XXX" />
              </div>
            </div>
          </div>

          {/* Pricing & Status */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="font-display font-bold text-[14px]">Pricing & Status</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Daily Rate (AUD){autoRate > 0 ? ` — auto: $${autoRate.toFixed(2)}` : ''}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
                  <input type="number" min="0" step="0.01" className={`${inp} pl-7`}
                    value={rateOverride}
                    onChange={e => setRateOverride(e.target.value)}
                    placeholder={autoRate > 0 ? autoRate.toFixed(2) : '0.00'} />
                </div>
                <p className="text-[11.5px] text-ink-4 mt-1">Leave blank to use the vehicle rate. Rates are in dollars.</p>
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select className={inp} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            {days > 0 && displayRate > 0 && (
              <div className="flex items-baseline gap-2 text-[13px] text-ink-3">
                <span>{days} day{days !== 1 ? 's' : ''} × ${displayRate.toFixed(2)}/day</span>
                <span className="font-display font-bold text-[20px] text-ink ml-2">${total.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-border rounded-xl p-5">
            <label className={lbl}>Notes / Trip Details</label>
            <textarea className={`${inp} h-20 resize-none`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Pickup location, special requirements, etc." />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="bg-accent text-white font-display font-bold text-[14px] px-7 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Booking'}
            </button>
            <a href="/admin/bookings" className="border border-border text-ink-3 font-medium text-[14px] px-5 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all">
              Cancel
            </a>
          </div>
        </form>
      )}
    </div>
  )
}
