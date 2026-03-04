'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ServiceType = 'taxi' | 'cpv' | 'vehicle'

interface Vehicle {
  id: string
  name: string
  description: string
  chauffeur_price: number
  passengers: number
  transmission: string
  fuel: string
  media: { url: string }[]
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
  reference: string
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  const steps = ['Service Type', 'Trip Details', 'Review & Submit']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const num = i + 1
        const done = num < step
        const active = num === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors
                ${done ? 'bg-accent border-accent text-white' : active ? 'bg-white border-accent text-accent' : 'bg-white border-border text-ink-4'}`}>
                {done ? '✓' : num}
              </span>
              <span className={`text-[13px] font-semibold hidden sm:inline ${active ? 'text-ink' : done ? 'text-accent' : 'text-ink-4'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-8 sm:w-12 h-0.5 bg-border mx-2" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Service type options ─────────────────────────────────────────────────────
const SERVICE_OPTIONS: { type: ServiceType; icon: string; title: string; subtitle: string }[] = [
  { type: 'taxi',    icon: '🚕', title: 'Taxi',             subtitle: 'Metered trip — rate calculated by meter at time of travel' },
  { type: 'cpv',     icon: '🚘', title: 'CPV',              subtitle: 'Chauffeur Permit Vehicle at a pre-agreed rate' },
  { type: 'vehicle', icon: '🚗', title: 'Specific Vehicle', subtitle: 'Choose a vehicle from our available fleet' },
]

// ─── Step 1: Service type + optional vehicle grid ─────────────────────────────
function StepService({
  serviceType, onSelectType,
  vehicles, selectedVehicleId, onSelectVehicle,
  onNext,
}: {
  serviceType: ServiceType | ''
  onSelectType: (t: ServiceType) => void
  vehicles: Vehicle[]
  selectedVehicleId: string
  onSelectVehicle: (id: string) => void
  onNext: () => void
}) {
  const canContinue =
    serviceType === 'taxi' ||
    serviceType === 'cpv' ||
    (serviceType === 'vehicle' && !!selectedVehicleId)

  return (
    <div>
      <h2 className="font-display font-bold text-[18px] mb-1">What type of service?</h2>
      <p className="text-[13.5px] text-ink-3 mb-6">Select the service that best fits the trip requirements.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {SERVICE_OPTIONS.map(opt => (
          <button key={opt.type} onClick={() => onSelectType(opt.type)}
            className={`text-left p-5 rounded-xl border-2 transition-all
              ${serviceType === opt.type ? 'border-accent bg-accent-bg/40' : 'border-border bg-white hover:border-accent/40'}`}>
            <span className="text-3xl mb-3 block">{opt.icon}</span>
            <p className={`font-display font-bold text-[15px] mb-1 ${serviceType === opt.type ? 'text-accent' : 'text-ink'}`}>
              {opt.title}
            </p>
            <p className="text-[12.5px] text-ink-3 leading-snug">{opt.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Vehicle grid — only when Specific Vehicle selected */}
      {serviceType === 'vehicle' && (
        <div className="mb-8">
          {vehicles.length === 0 ? (
            <div className="bg-white border border-border rounded-xl px-8 py-10 text-center">
              <p className="text-ink-3 text-[14px]">No vehicles are currently available for your account.</p>
              <p className="text-ink-4 text-[13px] mt-1">Please contact us to request vehicle access.</p>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-ink-3 mb-3">Choose a vehicle</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => {
                  const selected = selectedVehicleId === v.id
                  const imgUrl = v.media[0]?.url ?? null
                  return (
                    <button key={v.id} onClick={() => onSelectVehicle(v.id)}
                      className={`text-left bg-white rounded-xl border-2 overflow-hidden transition-all
                        ${selected ? 'border-accent shadow-md' : 'border-border hover:border-accent/40'}`}>
                      {imgUrl
                        ? <div className="h-36 overflow-hidden"><img src={imgUrl} alt={v.name} className="w-full h-full object-cover" /></div>
                        : <div className="h-36 bg-bg flex items-center justify-center text-ink-4 text-[13px]">No image</div>}
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display font-bold text-[14px] text-ink leading-tight">{v.name}</p>
                          {selected && <span className="shrink-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">Selected</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 mt-1 text-[12px] text-ink-3">
                          {v.passengers > 0 && <span>{v.passengers} pax</span>}
                          {v.transmission && <span>{v.transmission}</span>}
                        </div>
                        <p className="mt-1.5 font-semibold text-[13px] text-ink">
                          ${v.chauffeur_price.toFixed(2)}<span className="font-normal text-ink-3 text-[12px]"> / day</span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button onClick={onNext} disabled={!canContinue}
          className="bg-accent text-white font-semibold text-[13.5px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Trip details ─────────────────────────────────────────────────────
function StepDetails({
  serviceType, vehicle, clients, form, onChange, onBack, onNext,
}: {
  serviceType: ServiceType
  vehicle: Vehicle | null
  clients: Client[]
  form: DetailsForm
  onChange: (f: DetailsForm) => void
  onBack: () => void
  onNext: () => void
}) {
  const days = calcDays(form.start_date, form.end_date)
  const total = days > 0 && vehicle ? days * vehicle.chauffeur_price : null

  function set(key: keyof DetailsForm, val: string) {
    onChange({ ...form, [key]: val })
  }

  const canContinue =
    !!form.start_date && !!form.end_date && form.end_date >= form.start_date &&
    (form.client_type === 'existing' ? !!form.vendor_client_id : !!form.client_name)

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:border-accent bg-white'
  const lbl = 'block text-[12px] font-semibold text-ink-3 mb-1'
  const serviceName = serviceType === 'taxi' ? 'Taxi' : serviceType === 'cpv' ? 'CPV' : vehicle?.name ?? ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div>
          <h2 className="font-display font-bold text-[18px] mb-1">Trip details</h2>
          <p className="text-[13.5px] text-ink-3">Enter the trip dates and passenger information.</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <p className="font-semibold text-[13.5px] text-ink">Dates</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Start date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>End date</label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} className={inp} />
            </div>
          </div>
          {days > 0 && <p className="text-[12.5px] text-ink-3">{days} day{days !== 1 ? 's' : ''}</p>}
          {form.end_date && form.start_date && form.end_date < form.start_date && (
            <p className="text-[12.5px] text-red-600">End date must be on or after start date.</p>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <p className="font-semibold text-[13.5px] text-ink">Passenger / Client</p>
          <div className="flex gap-4">
            {[{ key: 'existing', label: 'Existing client' }, { key: 'oneoff', label: 'One-off passenger' }].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="client_type" value={opt.key} checked={form.client_type === opt.key}
                  onChange={() => onChange({ ...form, client_type: opt.key as 'existing' | 'oneoff', vendor_client_id: '', client_name: '', client_email: '', client_phone: '', client_reference: '' })}
                  className="accent-accent" />
                <span className="text-[13.5px] font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          {form.client_type === 'existing' ? (
            clients.length === 0 ? (
              <p className="text-[13px] text-ink-3">No clients on file. <a href="/vendor/clients/new" className="text-accent hover:underline">Add one first →</a></p>
            ) : (
              <div>
                <label className={lbl}>Select client *</label>
                <select value={form.vendor_client_id} onChange={e => set('vendor_client_id', e.target.value)} className={inp}>
                  <option value="">— select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.reference ? ` (${c.reference})` : ''}</option>)}
                </select>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <label className={lbl}>Full name *</label>
                <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)} className={inp} placeholder="e.g. John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} className={inp} placeholder="optional" />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input type="tel" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className={inp} placeholder="optional" />
                </div>
              </div>
              <div>
                <label className={lbl}>Reference / Claim no.</label>
                <input type="text" value={form.client_reference} onChange={e => set('client_reference', e.target.value)} className={inp} placeholder="optional" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-border rounded-xl p-5 sticky top-6 space-y-3">
          <p className="font-display font-bold text-[14px]">Booking summary</p>
          <div className="text-[13px] space-y-1.5">
            <div className="flex justify-between text-ink-3">
              <span>Service</span>
              <span className="text-ink font-medium">{serviceName}</span>
            </div>
            <div className="flex justify-between text-ink-3">
              <span>Rate</span>
              <span>
                {serviceType === 'vehicle' && vehicle
                  ? `$${vehicle.chauffeur_price.toFixed(2)} / day`
                  : serviceType === 'taxi' ? 'Metered' : 'Agreed rate'}
              </span>
            </div>
            <div className="flex justify-between text-ink-3">
              <span>Duration</span>
              <span>{days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '—'}</span>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-baseline">
            <span className="text-[12px] text-ink-3 font-semibold uppercase tracking-wide">Estimated total</span>
            <span className="font-display font-extrabold text-[22px]">
              {total != null ? `$${total.toFixed(2)}` : 'TBD'}
            </span>
          </div>
          {serviceType !== 'vehicle' && (
            <p className="text-[11.5px] text-ink-4">Final cost to be advised by our team after confirmation.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-3 flex justify-between pt-2">
        <button onClick={onBack} className="text-[13.5px] font-semibold text-ink-3 hover:text-ink transition-colors">← Back</button>
        <button onClick={onNext} disabled={!canContinue}
          className="bg-accent text-white font-semibold text-[13.5px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Review →
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Review + Submit ──────────────────────────────────────────────────
function StepReview({
  serviceType, vehicle, clients, form, onBack, onSubmit, submitting, error,
}: {
  serviceType: ServiceType
  vehicle: Vehicle | null
  clients: Client[]
  form: DetailsForm
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: string
}) {
  const days = calcDays(form.start_date, form.end_date)
  const total = vehicle ? days * vehicle.chauffeur_price : null
  const selectedClient = clients.find(c => c.id === form.vendor_client_id)
  const serviceName = serviceType === 'taxi' ? 'Taxi (metered)' : serviceType === 'cpv' ? 'CPV (agreed rate)' : vehicle?.name ?? ''

  const row = (label: string, value: string) => (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0 text-[13.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink">{value || '—'}</span>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-display font-bold text-[18px] mb-1">Review your booking</h2>
      <p className="text-[13.5px] text-ink-3 mb-6">Check the details below before submitting. Our team will confirm the booking.</p>

      <div className="bg-white border border-border rounded-xl divide-y divide-border mb-6">
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-2">Service</p>
          {row('Type', serviceName)}
          {serviceType === 'vehicle' && vehicle && row('Daily rate', `$${vehicle.chauffeur_price.toFixed(2)}`)}
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-2">Dates</p>
          {row('Start', form.start_date)}
          {row('End', form.end_date)}
          {row('Duration', `${days} day${days !== 1 ? 's' : ''}`)}
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-2">Passenger</p>
          {selectedClient ? (
            <>
              {row('Name', selectedClient.name)}
              {row('Email', selectedClient.email)}
              {row('Phone', selectedClient.phone)}
              {row('Reference', selectedClient.reference)}
            </>
          ) : (
            <>
              {row('Name', form.client_name)}
              {row('Email', form.client_email)}
              {row('Phone', form.client_phone)}
              {row('Reference', form.client_reference)}
            </>
          )}
        </div>
        <div className="px-5 py-4 bg-bg/50">
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] font-semibold text-ink-3">Estimated total</span>
            {total != null
              ? <span className="font-display font-extrabold text-[24px]">${total.toFixed(2)}</span>
              : <span className="font-display font-bold text-[18px] text-ink-3">To be advised</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-[6px] mb-4">{error}</div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} disabled={submitting}
          className="text-[13.5px] font-semibold text-ink-3 hover:text-ink transition-colors disabled:opacity-40">
          ← Back
        </button>
        <button onClick={onSubmit} disabled={submitting}
          className="bg-accent text-white font-display font-bold text-[14px] px-8 py-3 rounded-[6px] hover:bg-accent-dark disabled:opacity-60 transition-colors">
          {submitting ? 'Submitting…' : 'Submit Booking Request'}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface DetailsForm {
  start_date: string
  end_date: string
  client_type: 'existing' | 'oneoff'
  vendor_client_id: string
  client_name: string
  client_email: string
  client_phone: string
  client_reference: string
}

function calcDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewBookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [form, setForm] = useState<DetailsForm>({
    start_date: '', end_date: '',
    client_type: 'existing',
    vendor_client_id: '', client_name: '', client_email: '', client_phone: '', client_reference: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/vehicles').then(r => r.json()),
      fetch('/api/vendor/clients').then(r => r.json()),
    ]).then(([v, c]) => {
      setVehicles(v.vehicles ?? [])
      setClients(c.clients ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectedVehicle = serviceType === 'vehicle'
    ? (vehicles.find(v => v.id === selectedVehicleId) ?? null)
    : null

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const payload: Record<string, string> = {
        service_type: serviceType as string,
        start_date: form.start_date,
        end_date: form.end_date,
      }
      if (serviceType === 'vehicle') payload.vehicle_id = selectedVehicleId
      if (form.client_type === 'existing') {
        payload.vendor_client_id = form.vendor_client_id
      } else {
        payload.client_name = form.client_name
        payload.client_email = form.client_email
        payload.client_phone = form.client_phone
        payload.client_reference = form.client_reference
      }
      const res = await fetch('/api/vendor/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to submit booking.'); return }
      router.push(`/vendor/bookings/${data.booking.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><span className="text-ink-3 text-[14px]">Loading…</span></div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">New Booking Request</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Submit a transport request for your client.</p>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <StepService
          serviceType={serviceType}
          onSelectType={t => { setServiceType(t); if (t !== 'vehicle') setSelectedVehicleId('') }}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && serviceType && (
        <StepDetails
          serviceType={serviceType}
          vehicle={selectedVehicle}
          clients={clients}
          form={form}
          onChange={setForm}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && serviceType && (
        <StepReview
          serviceType={serviceType}
          vehicle={selectedVehicle}
          clients={clients}
          form={form}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  )
}
