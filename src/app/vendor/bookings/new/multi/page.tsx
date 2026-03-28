'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MultiDayPicker from '@/components/vendor/MultiDayPicker'

type ServiceType = 'taxi' | 'cpv' | 'vehicle'

interface Vehicle { id: string; name: string; passengers: number }
interface Client  { id: string; name: string; reference: string }
interface ExistingBooking { id: string; public_id: string; status: string; start_date: string }

interface BookingRow {
  _id: string
  date: string
  service_type: ServiceType
  vehicle_id: string
  pickup_address: string
  pickup_time: string
  passengers: string
  destination: string
  return_trip: boolean
  return_time: string
  vendor_client_id: string
  notes: string
}

function makeRow(date: string): BookingRow {
  return {
    _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date,
    service_type: 'taxi',
    vehicle_id: '',
    pickup_address: '',
    pickup_time: '',
    passengers: '1',
    destination: '',
    return_trip: false,
    return_time: '',
    vendor_client_id: '',
    notes: '',
  }
}

function formatDateLabel(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isRowValid(row: BookingRow): boolean {
  return (
    row.pickup_address.trim().length > 0 &&
    row.pickup_time.length > 0 &&
    parseInt(row.passengers) >= 1 &&
    (row.service_type !== 'vehicle' || row.vehicle_id.length > 0)
  )
}

const SERVICE_OPTIONS: { type: ServiceType; label: string }[] = [
  { type: 'taxi',    label: 'Taxi' },
  { type: 'cpv',     label: 'CPV' },
  { type: 'vehicle', label: 'Specific Vehicle' },
]

const inp = 'border border-border rounded-[6px] px-2.5 py-2 text-[13px] bg-white focus:outline-none focus:border-accent w-full'
const inpErr = 'border border-red-400 rounded-[6px] px-2.5 py-2 text-[13px] bg-white focus:outline-none focus:border-red-500 w-full'

// ─── Booking row card ─────────────────────────────────────────────────────────
function BookingRowCard({
  row, vehicles, clients, errors, showErrors,
  onChange, onDelete,
}: {
  row: BookingRow
  vehicles: Vehicle[]
  clients: Client[]
  errors: Record<string, boolean>
  showErrors: boolean
  onChange: (updated: BookingRow) => void
  onDelete: () => void
}) {
  function set<K extends keyof BookingRow>(key: K, val: BookingRow[K]) {
    onChange({ ...row, [key]: val })
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg/40">
        <p className="font-display font-bold text-[13.5px] text-ink">{formatDateLabel(row.date)}</p>
        <button onClick={onDelete}
          aria-label="Remove booking"
          className="text-ink-4 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-3">
        {/* Row 1: service + pickup address + time + pax */}
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_110px_80px] gap-2.5">
          {/* Service type */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Service</label>
            <select value={row.service_type}
              onChange={e => { set('service_type', e.target.value as ServiceType); set('vehicle_id', '') }}
              className={inp}>
              {SERVICE_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
            </select>
          </div>

          {/* Pickup address */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Pickup address <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={row.pickup_address}
              onChange={e => set('pickup_address', e.target.value)}
              placeholder="e.g. 12 Main St, Cohuna"
              className={showErrors && errors.pickup_address ? inpErr : inp}
            />
          </div>

          {/* Pickup time */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Pickup time <span className="text-red-500">*</span></label>
            <input
              type="time"
              value={row.pickup_time}
              onChange={e => set('pickup_time', e.target.value)}
              className={showErrors && errors.pickup_time ? inpErr : inp}
            />
          </div>

          {/* Passengers */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Pax <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              value={row.passengers}
              onChange={e => set('passengers', e.target.value)}
              className={showErrors && errors.passengers ? inpErr : inp}
            />
          </div>
        </div>

        {/* Vehicle picker — shown only when service = vehicle */}
        {row.service_type === 'vehicle' && (
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Vehicle <span className="text-red-500">*</span></label>
            {vehicles.length === 0 ? (
              <p className="text-[12.5px] text-ink-4">No vehicles available on your account.</p>
            ) : (
              <select value={row.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
                className={showErrors && errors.vehicle_id ? inpErr : inp}>
                <option value="">— select vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers} pax)` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Row 2: destination + return + client + notes */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_120px_1fr_1fr] gap-2.5 items-end">
          {/* Destination */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Destination</label>
            <input type="text" value={row.destination}
              onChange={e => set('destination', e.target.value)}
              placeholder="optional" className={inp} />
          </div>

          {/* Return trip toggle */}
          <div className="pb-0.5">
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Return</label>
            <button
              type="button"
              onClick={() => set('return_trip', !row.return_trip)}
              className={`relative rounded-full transition-colors border ${row.return_trip ? 'bg-accent border-accent' : 'bg-bg border-border'}`}
              style={{ width: 40, height: 22 }}
              title={row.return_trip ? 'Return trip on' : 'Return trip off'}
            >
              <span className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${row.return_trip ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Return time */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Return time</label>
            <input type="time" value={row.return_time}
              onChange={e => set('return_time', e.target.value)}
              disabled={!row.return_trip}
              className={`${inp} disabled:opacity-40 disabled:cursor-not-allowed`} />
          </div>

          {/* Client */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Client</label>
            <select value={row.vendor_client_id}
              onChange={e => set('vendor_client_id', e.target.value)}
              className={inp}>
              <option value="">— optional —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.reference ? ` (${c.reference})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-3 mb-1">Notes</label>
            <input type="text" value={row.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="optional" className={inp} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MultiBookingPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([])
  const [loading, setLoading] = useState(true)

  const [rows, setRows] = useState<BookingRow[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/vehicles').then(r => r.json()),
      fetch('/api/vendor/clients').then(r => r.json()),
      fetch('/api/vendor/bookings').then(r => r.json()),
    ]).then(([v, c, b]) => {
      setVehicles(v.vehicles ?? [])
      setClients(c.clients ?? [])
      setExistingBookings(b.bookings ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function handleDayClick(date: string) {
    setRows(prev => [...prev, makeRow(date)])
    setShowErrors(false)
  }

  function updateRow(id: string, updated: BookingRow) {
    setRows(prev => prev.map(r => r._id === id ? updated : r))
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  // Compute per-row errors
  function getRowErrors(row: BookingRow): Record<string, boolean> {
    return {
      pickup_address: !row.pickup_address.trim(),
      pickup_time: !row.pickup_time,
      passengers: isNaN(parseInt(row.passengers)) || parseInt(row.passengers) < 1,
      vehicle_id: row.service_type === 'vehicle' && !row.vehicle_id,
    }
  }

  const allValid = rows.length > 0 && rows.every(r => isRowValid(r))

  // Existing bookings formatted for MultiDayPicker
  const pickerBookings = existingBookings.map(b => ({
    date: b.start_date,
    status: b.status,
    public_id: b.public_id,
  }))

  async function handleSubmit() {
    if (!allValid) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    let created = 0

    try {
      for (let i = 0; i < rows.length; i++) {
        setProgress(`Creating booking ${i + 1} of ${rows.length}…`)
        const row = rows[i]
        const trip_details = JSON.stringify({
          pickup_address: row.pickup_address,
          pickup_time: row.pickup_time,
          passengers: parseInt(row.passengers),
          destination: row.destination || null,
          return_trip: row.return_trip,
          return_time: row.return_trip ? row.return_time : null,
          notes: row.notes || null,
        })

        const payload: Record<string, string> = {
          service_type: row.service_type,
          start_date: row.date,
          end_date: row.date,
          trip_details,
        }
        if (row.service_type === 'vehicle' && row.vehicle_id) payload.vehicle_id = row.vehicle_id
        if (row.vendor_client_id) payload.vendor_client_id = row.vendor_client_id

        const res = await fetch('/api/vendor/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? `Booking ${i + 1} failed`)
        }
        created++
      }
      router.push(`/vendor/bookings?created=${created}`)
    } catch (e) {
      setSubmitError(
        `${created} of ${rows.length} bookings were created. ${e instanceof Error ? e.message : 'An error occurred.'}`
      )
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-ink-3 text-[14px]">Loading…</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Book Multiple</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">Click days on the calendar to add booking rows, then fill in the details.</p>
        </div>
        <Link href="/vendor/bookings"
          className="text-[13px] text-ink-3 hover:text-ink transition-colors mt-1 whitespace-nowrap">
          ← Back to bookings
        </Link>
      </div>

      <div className="space-y-6">
        {/* Calendar */}
        <MultiDayPicker onDayClick={handleDayClick} existingBookings={pickerBookings} />

        {/* Booking rows */}
        {rows.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-xl px-8 py-14 text-center">
            <p className="text-ink-3 text-[14px]">No bookings added yet.</p>
            <p className="text-ink-4 text-[13px] mt-1">Click a day on the calendar above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Row count + submit */}
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-semibold text-ink">
                {rows.length} booking{rows.length !== 1 ? 's' : ''} queued
              </p>
              <button
                onClick={handleSubmit}
                disabled={submitting || !allValid && showErrors}
                className="bg-accent text-white font-display font-bold text-[14px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50 transition-colors">
                {submitting ? progress || 'Creating…' : `Create ${rows.length} Booking${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-[6px]">
                {submitError}
              </div>
            )}

            {showErrors && !allValid && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-[13px] px-4 py-2.5 rounded-[6px]">
                Please fill in all required fields (marked with *) before submitting.
              </div>
            )}

            {rows.map(row => (
              <BookingRowCard
                key={row._id}
                row={row}
                vehicles={vehicles}
                clients={clients}
                errors={getRowErrors(row)}
                showErrors={showErrors}
                onChange={updated => updateRow(row._id, updated)}
                onDelete={() => deleteRow(row._id)}
              />
            ))}

            {/* Bottom submit */}
            {rows.length > 3 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-accent text-white font-display font-bold text-[14px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50 transition-colors">
                  {submitting ? progress || 'Creating…' : `Create ${rows.length} Booking${rows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
