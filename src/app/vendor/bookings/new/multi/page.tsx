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

// Column grid — matches header and row
const COLS = 'grid grid-cols-[108px_88px_130px_minmax(160px,1fr)_86px_52px_110px_140px_120px_110px_32px] gap-1.5'
const cell = 'border border-border rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-accent w-full'
const cellErr = 'border border-red-400 rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-red-500 w-full'
const lbl = 'text-[10.5px] font-semibold uppercase tracking-wide text-ink-4'

// ─── Table header ─────────────────────────────────────────────────────────────
function BookingTableHeader() {
  return (
    <div className={`${COLS} items-center px-3 py-2 bg-bg border-b border-border rounded-t-lg`}>
      <span className={lbl}>Date</span>
      <span className={lbl}>Service</span>
      <span className={lbl}>Vehicle</span>
      <span className={lbl}>Pickup address <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>Time <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>Pax <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>Destination</span>
      <span className={lbl}>Return</span>
      <span className={lbl}>Client</span>
      <span className={lbl}>Notes</span>
      <span />
    </div>
  )
}

// ─── Booking table row ────────────────────────────────────────────────────────
function BookingTableRow({
  row, vehicles, clients, errors, showErrors, isLast,
  onChange, onDelete,
}: {
  row: BookingRow
  vehicles: Vehicle[]
  clients: Client[]
  errors: Record<string, boolean>
  showErrors: boolean
  isLast: boolean
  onChange: (updated: BookingRow) => void
  onDelete: () => void
}) {
  function set<K extends keyof BookingRow>(key: K, val: BookingRow[K]) {
    onChange({ ...row, [key]: val })
  }
  const c = (err: boolean) => err ? cellErr : cell

  return (
    <div className={`${COLS} items-center px-3 py-1.5 bg-white hover:bg-bg/30 transition-colors ${isLast ? 'rounded-b-lg' : 'border-b border-border'}`}>
      {/* Date */}
      <span className="text-[12.5px] font-medium text-ink truncate pr-1">{formatDateLabel(row.date)}</span>

      {/* Service */}
      <select value={row.service_type}
        onChange={e => onChange({ ...row, service_type: e.target.value as ServiceType, vehicle_id: '' })}
        className={cell}>
        {SERVICE_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
      </select>

      {/* Vehicle */}
      {row.service_type === 'vehicle' ? (
        <select value={row.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
          className={c(showErrors && errors.vehicle_id)}>
          <option value="">— select —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers})` : ''}</option>)}
        </select>
      ) : (
        <span className="text-[12px] text-ink-4 px-2 select-none">—</span>
      )}

      {/* Pickup address */}
      <input type="text" value={row.pickup_address}
        onChange={e => set('pickup_address', e.target.value)}
        placeholder="Pickup address"
        className={c(showErrors && errors.pickup_address)} />

      {/* Time */}
      <input type="time" value={row.pickup_time}
        onChange={e => set('pickup_time', e.target.value)}
        className={c(showErrors && errors.pickup_time)} />

      {/* Pax */}
      <input type="number" min={1} value={row.passengers}
        onChange={e => set('passengers', e.target.value)}
        className={c(showErrors && errors.passengers)} />

      {/* Destination */}
      <input type="text" value={row.destination}
        onChange={e => set('destination', e.target.value)}
        placeholder="optional"
        className={cell} />

      {/* Return toggle + conditional time */}
      <div className="flex items-center gap-1.5">
        <button type="button"
          onClick={() => set('return_trip', !row.return_trip)}
          title={row.return_trip ? 'Return on' : 'Return off'}
          className={`relative flex-shrink-0 rounded-full border transition-colors ${row.return_trip ? 'bg-accent border-accent' : 'bg-bg border-border'}`}
          style={{ width: 30, height: 17 }}>
          <span className={`absolute top-[1.5px] rounded-full bg-white shadow transition-transform ${row.return_trip ? 'translate-x-[13px]' : 'translate-x-[1.5px]'}`}
            style={{ width: 13, height: 13 }} />
        </button>
        <input type="time" value={row.return_time}
          onChange={e => set('return_time', e.target.value)}
          disabled={!row.return_trip}
          className={`${cell} disabled:opacity-30 disabled:cursor-not-allowed flex-1 min-w-0`} />
      </div>

      {/* Client */}
      <select value={row.vendor_client_id}
        onChange={e => set('vendor_client_id', e.target.value)}
        className={cell}>
        <option value="">— optional —</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.reference ? ` (${c.reference})` : ''}</option>)}
      </select>

      {/* Notes */}
      <input type="text" value={row.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder="optional"
        className={cell} />

      {/* Delete */}
      <button onClick={onDelete} aria-label="Remove booking"
        className="flex items-center justify-center text-ink-4 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>
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

            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="min-w-[1150px]">
                <BookingTableHeader />
                {rows.map((row, i) => (
                  <BookingTableRow
                    key={row._id}
                    row={row}
                    vehicles={vehicles}
                    clients={clients}
                    errors={getRowErrors(row)}
                    showErrors={showErrors}
                    isLast={i === rows.length - 1}
                    onChange={updated => updateRow(row._id, updated)}
                    onDelete={() => deleteRow(row._id)}
                  />
                ))}
              </div>
            </div>

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
