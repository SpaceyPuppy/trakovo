'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Calendar from './Calendar'
import HireAgreementModal from './HireAgreementModal'
import type { Clause } from '@/lib/hire-agreement-defaults'
import type { Vehicle, AvailabilityRange, BookingFormState, TripLeg } from '@/types'
import { freshBookingState } from '@/types'
import { formatCurrency, diffDays, toISODate, getDailyRate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AlternativeVehicle {
  id: string
  slug: string
  name: string
  price: number
  chauffeur_price: number
  hire_modes: string
  image: string | null
}

interface Props {
  vehicle: Vehicle
  availability: AvailabilityRange[]
  vehicleBasePath?: string
  hireAgreementClauses: Clause[]
}

function hasConflict(start: Date, end: Date, ranges: AvailabilityRange[]): boolean {
  const s = toISODate(start)
  const e = toISODate(end)
  return ranges.some(r => !(e < r.start || s > r.end))
}

function ageOnDate(dob: string, onDate: Date): number {
  const d = new Date(dob)
  let age = onDate.getFullYear() - d.getFullYear()
  const m = onDate.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && onDate.getDate() < d.getDate())) age--
  return age
}

function buildTripDetails(form: BookingFormState): string | undefined {
  const firstLeg = form.tripLegs[0]
  const hasAnyData = !!(firstLeg.date || firstLeg.pickup || firstLeg.dropoff ||
    firstLeg.pickupTime || firstLeg.dropoffTime ||
    form.returnMode !== 'none' || form.passengerCount || form.tripPurpose)
  if (!hasAnyData) return undefined

  const legs: TripLeg[] = [...form.tripLegs]
  if (form.returnMode === 'same' && firstLeg.pickup && firstLeg.dropoff) {
    legs.push({
      date: firstLeg.date,
      pickup: firstLeg.dropoff,
      dropoff: firstLeg.pickup,
      pickupTime: form.returnTime,
      dropoffTime: '',
    })
  }
  return JSON.stringify({ legs, passengerCount: form.passengerCount, tripPurpose: form.tripPurpose })
}

export default function BookingPanel({ vehicle, availability, vehicleBasePath = '/vehicles', hireAgreementClauses }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<BookingFormState>(() => {
    const s = freshBookingState()
    if (vehicle.meta.hire_modes === 'chauffeured_only') s.hireType = 'chauffeured'
    return s
  })
  const [agreementOpen, setAgreementOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Conflict / alternatives state
  const [conflicted, setConflicted] = useState(false)
  const [alternatives, setAlternatives] = useState<AlternativeVehicle[]>([])
  const [loadingAlts, setLoadingAlts] = useState(false)
  const [isEnquiry, setIsEnquiry] = useState(false)

  const isDual = vehicle.meta.hire_modes === 'both'
  const days = form.startDate && form.endDate ? diffDays(form.startDate, form.endDate) + 1 : 0
  const hireTypeForRate = form.hireType === 'dry-hire' ? 'dry-hire' : 'chauffeured'
  const rate = days > 0 ? getDailyRate(vehicle, hireTypeForRate, days) : (form.hireType === 'dry-hire' ? vehicle.price : vehicle.chauffeur_price)
  const total = days * rate

  // Age check for dry-hire
  const age = form.driverDob && form.startDate ? ageOnDate(form.driverDob, form.startDate) : null
  const isUnder25 = age !== null && age < 25

  const update = useCallback((patch: Partial<BookingFormState>) => {
    setForm(f => ({ ...f, ...patch }))
  }, [])

  // Detect date conflicts and fetch alternatives
  useEffect(() => {
    if (!form.startDate || !form.endDate) {
      setConflicted(false)
      setAlternatives([])
      setIsEnquiry(false)
      return
    }
    const conflict = hasConflict(form.startDate, form.endDate, availability)
    setConflicted(conflict)
    if (!conflict) {
      setAlternatives([])
      setIsEnquiry(false)
      return
    }
    setLoadingAlts(true)
    const start = toISODate(form.startDate)
    const end = toISODate(form.endDate)
    fetch(`/api/vehicles/available?start=${start}&end=${end}&exclude=${vehicle.id}`)
      .then(r => r.json())
      .then((data: AlternativeVehicle[]) => setAlternatives(data))
      .catch(() => setAlternatives([]))
      .finally(() => setLoadingAlts(false))
  }, [form.startDate, form.endDate, availability, vehicle.id])

  function canSubmit(): boolean {
    if (!form.hireType || !form.startDate || !form.endDate) return false
    if (isEnquiry) {
      return !!(form.contactName.trim() || form.driverName.trim()) &&
        !!(form.contactEmail.trim()) && !!(form.contactPhone.trim())
    }
    if (form.hireType === 'chauffeured') {
      return !!(form.contactName.trim() && form.contactEmail.trim() && form.contactPhone.trim())
    }
    // dry-hire
    const base = !!(form.driverName.trim() && form.contactEmail.trim()
      && form.contactPhone.trim() && form.driverDob && form.agreed)
    if (!base) return false
    if (isUnder25) return !!(form.under25Confirmed && form.altDriverName.trim() && form.altDriverDob)
    return true
  }

  async function handleSubmit() {
    if (!canSubmit() || !form.startDate || !form.endDate) return
    setSubmitting(true)
    setError(null)
    try {
      const startIso = toISODate(form.startDate)
      const endIso = toISODate(form.endDate)

      const driverName = isUnder25 ? form.altDriverName : form.driverName
      const driverDob = isUnder25 ? form.altDriverDob : form.driverDob

      const body = form.hireType === 'dry-hire' && !isEnquiry ? {
        product_id: vehicle.id,
        hire_type: 'dry-hire',
        start_date: startIso,
        end_date: endIso,
        contact_name: form.driverName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone,
        driver_name: driverName,
        driver_dob: driverDob,
        agreement_accepted: true,
      } : {
        product_id: vehicle.id,
        hire_type: form.hireType ?? 'chauffeured',
        start_date: startIso,
        end_date: endIso,
        contact_name: form.hireType === 'dry-hire' ? form.driverName : form.contactName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone,
        is_enquiry: isEnquiry,
        ...(form.hireType === 'chauffeured' && !isEnquiry
          ? { trip_details: buildTripDetails(form) }
          : {}),
      }

      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Booking failed')

      const displayName = isEnquiry
        ? (form.contactName || form.driverName)
        : form.hireType === 'dry-hire' ? form.driverName : form.contactName

      router.push(
        `/confirmation?ref=${data.booking.public_id}` +
        `&vehicle=${encodeURIComponent(vehicle.name)}` +
        `&start=${startIso}&end=${endIso}` +
        `&type=${form.hireType}` +
        `&name=${encodeURIComponent(displayName)}` +
        `&email=${encodeURIComponent(form.contactEmail)}` +
        `&phone=${encodeURIComponent(form.contactPhone)}` +
        `&total=${total}` +
        (isEnquiry ? '&enquiry=true' : '')
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Trip leg helpers
  function updateLeg(index: number, patch: Partial<TripLeg>) {
    const legs = form.tripLegs.map((l, i) => i === index ? { ...l, ...patch } : l)
    update({ tripLegs: legs })
  }
  function addLeg() {
    update({ tripLegs: [...form.tripLegs, { date: '', pickup: '', dropoff: '', pickupTime: '', dropoffTime: '' }] })
  }
  function removeLeg(index: number) {
    update({ tripLegs: form.tripLegs.filter((_, i) => i !== index) })
  }

  const startMin = form.startDate ? toISODate(form.startDate) : undefined
  const startMax = form.endDate ? toISODate(form.endDate) : undefined

  return (
    <>
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-card-lg sticky top-[80px]">
        {/* Header */}
        <div className="bg-slate px-6 py-5">
          <p className="font-display font-bold text-[17px] text-white mb-0.5">Book This Vehicle</p>
          <p className="text-[12.5px] text-white/50">Select your hire type and dates</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Hire mode */}
          {isDual ? (
            <div>
              <p className="text-[11.5px] font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Hire Type</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'chauffeured', icon: '🤵', label: 'Chauffeured', sub: 'Driver included' },
                  { key: 'dry-hire', icon: '🔑', label: 'Dry Hire', sub: 'Self-drive' },
                ].map(({ key, icon, label, sub }) => (
                  <button key={key} onClick={() => update({ hireType: key as 'chauffeured' | 'dry-hire' })}
                    className={cn('border-[1.5px] rounded-[6px] p-3 text-center transition-all', form.hireType === key ? 'border-accent bg-accent-bg' : 'border-border hover:border-ink-2')}>
                    <span className="text-xl block mb-1">{icon}</span>
                    <span className={cn('text-[12.5px] font-semibold block', form.hireType === key ? 'text-accent-dark' : 'text-ink')}>{label}</span>
                    <span className="text-[11px] text-ink-4 mt-0.5 block">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-[1.5px] border-accent bg-accent-bg rounded-[6px] px-3.5 py-3 flex items-center gap-3">
              <span className="text-xl">🤵</span>
              <div>
                <span className="text-[12.5px] font-semibold text-accent-dark block">Chauffeured Hire</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mt-0.5">This vehicle is chauffeur service only</span>
              </div>
            </div>
          )}

          {/* Calendar */}
          <Calendar
            startDate={form.startDate}
            endDate={form.endDate}
            bookedRanges={availability}
            onChange={(start, end) => update({ startDate: start, endDate: end })}
          />

          {/* ── Conflict banner ─────────────────────────────────────────── */}
          {conflicted && form.startDate && form.endDate && (
            <div className="border border-amber-300 bg-amber-50 rounded-[8px] overflow-hidden">
              <div className="px-3.5 py-3 border-b border-amber-200 flex items-center gap-2">
                <span className="text-amber-500 text-base">⚠</span>
                <p className="text-[12.5px] font-bold text-amber-800">These dates are already booked</p>
              </div>
              <div className="px-3.5 py-3">
                {isEnquiry ? (
                  <div className="space-y-2">
                    <p className="text-[12.5px] text-amber-800 font-medium">
                      You're submitting a <strong>waitlist enquiry</strong>. We'll contact you if this vehicle becomes available for these dates due to a cancellation.
                    </p>
                    <button onClick={() => setIsEnquiry(false)} className="text-[12px] text-amber-700 underline">
                      Cancel enquiry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loadingAlts ? (
                      <p className="text-[12px] text-amber-700">Finding available alternatives…</p>
                    ) : alternatives.length > 0 ? (
                      <div>
                        <p className="text-[11.5px] font-bold text-amber-800 uppercase tracking-wide mb-2">
                          Available for your dates:
                        </p>
                        <div className="space-y-2">
                          {alternatives.map(alt => (
                            <Link
                              key={alt.id}
                              href={`${vehicleBasePath}/${alt.slug}`}
                              className="flex items-center gap-2.5 bg-white border border-amber-200 rounded-[6px] px-2.5 py-2 hover:border-accent hover:shadow-sm transition-all"
                            >
                              {alt.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={alt.image} alt={alt.name} className="w-10 h-8 rounded object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-10 h-8 bg-slate rounded flex items-center justify-center text-base flex-shrink-0">🚗</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-semibold text-ink truncate">{alt.name}</p>
                                <p className="text-[11px] text-ink-4">From {formatCurrency(alt.hire_modes === 'chauffeured_only' ? alt.chauffeur_price : alt.price)}/day</p>
                              </div>
                              <span className="text-[11px] text-accent font-semibold flex-shrink-0">View →</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12px] text-amber-700">No other vehicles available for these dates.</p>
                    )}
                    <div className="pt-1 border-t border-amber-200">
                      <p className="text-[12px] text-amber-800 mb-1.5">Still want this specific vehicle?</p>
                      <button
                        onClick={() => setIsEnquiry(true)}
                        className="w-full text-[12.5px] font-semibold text-amber-800 border border-amber-400 bg-white rounded-[6px] px-3 py-2 hover:bg-amber-100 transition-colors"
                      >
                        Submit a Waitlist Enquiry →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price strip */}
          {form.startDate && form.endDate && (
            <div className="bg-bg rounded-[6px] px-3.5 py-3 flex items-center justify-between">
              <div className="text-[12.5px] text-ink-2">
                <strong className="block font-display font-bold text-[14px] text-ink">
                  {form.startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} –{' '}
                  {form.endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </strong>
                {days} day{days > 1 ? 's' : ''} × {formatCurrency(rate)}/day
              </div>
              <span className="font-display font-extrabold text-[24px] tracking-tight">{formatCurrency(total)}</span>
            </div>
          )}

          {/* ── Chauffeured contact form ─────────────────────────────── */}
          {(form.hireType === 'chauffeured' || isEnquiry) && (
            <div className={cn('border rounded-[6px] p-4 space-y-3', isEnquiry ? 'border-amber-300 bg-amber-50' : 'border-[#c8dde8] bg-[#f5fafd]')}>
              <p className={cn('text-[12.5px] font-bold', isEnquiry ? 'text-amber-800' : 'text-[#1a4560]')}>
                {isEnquiry ? '📋 Your Contact Details (Enquiry)' : '👤 Your Contact Details'}
              </p>
              <Field label="Full Name" required>
                <input className={inp} type="text" placeholder="Jane Smith"
                  value={form.hireType === 'dry-hire' ? form.driverName : form.contactName}
                  onChange={e => form.hireType === 'dry-hire' ? update({ driverName: e.target.value }) : update({ contactName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Email Address" required>
                  <input className={inp} type="email" placeholder="jane@example.com" value={form.contactEmail} onChange={e => update({ contactEmail: e.target.value })} />
                </Field>
                <Field label="Phone Number" required>
                  <input className={inp} type="tel" placeholder="04xx xxx xxx" value={form.contactPhone} onChange={e => update({ contactPhone: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Chauffeured trip schedule ────────────────────────────── */}
          {form.hireType === 'chauffeured' && !isEnquiry && (
            <div className="border border-border rounded-[6px] p-4 space-y-4">
              <div>
                <p className="text-[12.5px] font-bold text-ink mb-0.5">🗺 Trip Schedule <span className="text-ink-4 font-normal">(optional)</span></p>
                <p className="text-[11.5px] text-ink-3">Help us prepare — provide details about your trip. You can add multiple legs.</p>
              </div>

              {/* Trip legs */}
              {form.tripLegs.map((leg, i) => (
                <div key={i} className="bg-bg rounded-[6px] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wide">Trip {i + 1}</p>
                    {i > 0 && (
                      <button onClick={() => removeLeg(i)} className="text-[11px] text-red-500 hover:underline">Remove</button>
                    )}
                  </div>
                  <Field label="Date">
                    <input className={inp} type="date" value={leg.date} min={startMin} max={startMax}
                      onChange={e => updateLeg(i, { date: e.target.value })} />
                  </Field>
                  <Field label="Pickup location">
                    <input className={inp} type="text" placeholder="e.g. 123 Main St, Melbourne" value={leg.pickup}
                      onChange={e => updateLeg(i, { pickup: e.target.value })} />
                  </Field>
                  <Field label="Dropoff location">
                    <input className={inp} type="text" placeholder="e.g. Melbourne Airport T2" value={leg.dropoff}
                      onChange={e => updateLeg(i, { dropoff: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Pickup time">
                      <input className={inp} type="time" value={leg.pickupTime}
                        onChange={e => updateLeg(i, { pickupTime: e.target.value })} />
                    </Field>
                    <Field label="Arrival by">
                      <input className={inp} type="time" value={leg.dropoffTime}
                        onChange={e => updateLeg(i, { dropoffTime: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ))}

              {/* Return trip (only for first leg context) */}
              {form.tripLegs.length === 1 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wide">Return trip?</p>
                  {[
                    { value: 'none', label: 'No return trip' },
                    { value: 'same', label: 'Returning to pickup location' },
                    { value: 'different', label: 'Continuing to another destination' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="returnMode" value={opt.value}
                        checked={form.returnMode === opt.value}
                        onChange={() => update({ returnMode: opt.value as BookingFormState['returnMode'] })}
                        className="accent-accent" />
                      <span className="text-[12.5px] text-ink">{opt.label}</span>
                    </label>
                  ))}
                  {form.returnMode === 'same' && (
                    <div className="pl-5 pt-1">
                      <Field label="Return pickup time">
                        <input className={inp} type="time" value={form.returnTime}
                          onChange={e => update({ returnTime: e.target.value })} />
                      </Field>
                    </div>
                  )}
                  {form.returnMode === 'different' && (
                    <button onClick={addLeg}
                      className="text-[12.5px] font-semibold text-accent hover:underline pl-5">
                      + Add next trip leg
                    </button>
                  )}
                </div>
              )}

              {/* Add leg button (when already multiple legs) */}
              {form.tripLegs.length > 1 && (
                <button onClick={addLeg} className="text-[12.5px] font-semibold text-accent hover:underline">
                  + Add another trip leg
                </button>
              )}

              {/* Optional extras */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Passengers (optional)">
                    <select className={inp} value={form.passengerCount} onChange={e => update({ passengerCount: e.target.value })}>
                      <option value="">Not specified</option>
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={String(n)}>{n}</option>)}
                      <option value="9+">9 or more</option>
                    </select>
                  </Field>
                  <Field label="Purpose (optional)">
                    <div className="flex gap-3 items-center h-[34px]">
                      {['personal', 'business'].map(p => (
                        <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="tripPurpose" value={p}
                            checked={form.tripPurpose === p}
                            onChange={() => update({ tripPurpose: p })}
                            className="accent-accent" />
                          <span className="text-[12.5px] text-ink capitalize">{p}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Dry hire form ─────────────────────────────────────────── */}
          {form.hireType === 'dry-hire' && !isEnquiry && (
            <div className="border border-[#e8d8c4] bg-[#fffaf5] rounded-[6px] p-4 space-y-3">
              <p className="text-[12.5px] font-bold text-[#7a4e20]">🔑 Driver Details</p>
              <Field label="Full Name" required>
                <input className={inp} type="text" placeholder="Jane Smith" value={form.driverName} onChange={e => update({ driverName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Email Address" required>
                  <input className={inp} type="email" placeholder="jane@example.com" value={form.contactEmail} onChange={e => update({ contactEmail: e.target.value })} />
                </Field>
                <Field label="Phone Number" required>
                  <input className={inp} type="tel" placeholder="04xx xxx xxx" value={form.contactPhone} onChange={e => update({ contactPhone: e.target.value })} />
                </Field>
              </div>
              <Field label="Date of Birth" required>
                <input className={inp} type="date" value={form.driverDob} onChange={e => update({ driverDob: e.target.value })} />
              </Field>

              {/* Under-25 warning */}
              {isUnder25 && (
                <div className="border border-amber-300 bg-amber-50 rounded-[6px] p-3 space-y-2.5">
                  <p className="text-[12.5px] font-bold text-amber-800">⚠ Age Requirement — Under 25</p>
                  <p className="text-[12px] text-amber-700">
                    Our self-drive vehicles require the primary driver to be 25 or older on the collection date.
                    Based on your date of birth you will be <strong>{age}</strong> on {form.startDate?.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.under25Confirmed}
                      onChange={e => update({ under25Confirmed: e.target.checked })}
                      className="mt-0.5 accent-amber-600" />
                    <span className="text-[12px] text-amber-800 leading-snug">
                      I confirm I will <strong>not</strong> be driving this vehicle. The hire agreement will be in the name of the driver listed below.
                    </span>
                  </label>
                  {form.under25Confirmed && (
                    <div className="pt-1 space-y-2.5 border-t border-amber-200">
                      <p className="text-[11.5px] font-semibold text-amber-800">Nominated driver details</p>
                      <Field label="Driver's Full Name" required>
                        <input className={inp} type="text" placeholder="Full name as on licence" value={form.altDriverName}
                          onChange={e => update({ altDriverName: e.target.value })} />
                      </Field>
                      <Field label="Driver's Date of Birth" required>
                        <input className={inp} type="date" value={form.altDriverDob}
                          onChange={e => update({ altDriverDob: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setAgreementOpen(true)}
                className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 border rounded-[6px] text-left transition-all', form.agreed ? 'border-success bg-success-bg' : 'border-border hover:border-ink-3 bg-white')}>
                <span className={cn('w-4 h-4 border-[1.5px] rounded-[4px] flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 transition-all', form.agreed ? 'bg-success border-success text-white' : 'border-border-2')}>
                  {form.agreed ? '✓' : ''}
                </span>
                <span className="text-[12px] text-ink-2 leading-snug">
                  I have read and accept the <span className="text-accent underline">Vehicle Hire Agreement</span> <span className="text-red-500">*</span>
                </span>
              </button>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>}

          {/* Submit */}
          <button
            disabled={!canSubmit() || submitting}
            onClick={handleSubmit}
            className={cn(
              'w-full py-3.5 text-white font-display font-bold text-[14.5px] rounded-[6px] flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
              isEnquiry
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-accent hover:bg-accent-dark hover:-translate-y-px'
            )}
          >
            {submitting ? (
              <><span className="spinner" /> Submitting...</>
            ) : isEnquiry ? '→ Submit Waitlist Enquiry'
              : !form.hireType ? 'Select a hire type above'
              : !form.startDate || !form.endDate ? 'Select your dates above'
              : form.hireType === 'dry-hire' ? '→ Request Dry Hire Booking'
              : '→ Request Chauffeured Booking'}
          </button>
        </div>
      </div>

      <HireAgreementModal
        open={agreementOpen}
        onAccept={() => { update({ agreed: true }); setAgreementOpen(false) }}
        onClose={() => setAgreementOpen(false)}
        clauses={hireAgreementClauses}
      />
    </>
  )
}

// Small helpers
const inp = 'w-full border border-border rounded-[6px] px-2.5 py-2 text-[13px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-ink-3 tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
