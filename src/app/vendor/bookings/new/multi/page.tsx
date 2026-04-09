'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import MultiDayPicker from '@/components/vendor/MultiDayPicker'

type ServiceType = 'taxi' | 'cpv' | 'vehicle'
type TripMode = 'taxi' | 'vehicle_hire'
type VehicleMode = 'same' | 'individual'

interface Vehicle { id: string; name: string; passengers: number }
interface Client  { id: string; name: string; reference: string }
interface ExistingBooking { id: string; public_id: string; status: string; start_date: string }

interface TaxiBookingRow {
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

interface VehicleHireRow {
  _id: string
  start_date: string
  end_date: string
  vehicle_id: string
  notes: string
}

type BookingRow = TaxiBookingRow | VehicleHireRow

function makeTaxiRow(date: string): TaxiBookingRow {
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

function makeVehicleHireRow(date: string): VehicleHireRow {
  return {
    _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    start_date: date,
    end_date: date,
    vehicle_id: '',
    notes: '',
  }
}

function formatDateLabel(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isTaxiRowValid(row: TaxiBookingRow): boolean {
  return (
    row.pickup_address.trim().length > 0 &&
    row.pickup_time.length > 0 &&
    parseInt(row.passengers) >= 1 &&
    (row.service_type !== 'vehicle' || row.vehicle_id.length > 0)
  )
}

function isVehicleHireRowValid(row: VehicleHireRow, vehicleMode: VehicleMode): boolean {
  return (
    row.start_date.length > 0 &&
    row.end_date.length > 0 &&
    (vehicleMode === 'same' || row.vehicle_id.length > 0)
  )
}

const SERVICE_OPTIONS: { type: ServiceType; label: string }[] = [
  { type: 'taxi',    label: 'Taxi' },
  { type: 'cpv',     label: 'CPV' },
  { type: 'vehicle', label: 'Specific Vehicle' },
]

// Column grids
const TAXI_COLS = 'grid grid-cols-[108px_88px_130px_minmax(160px,1fr)_86px_52px_110px_140px_120px_110px_32px] gap-1.5'
const HIRE_COLS_INDIVIDUAL = 'grid grid-cols-[140px_140px_150px_minmax(160px,1fr)_32px] gap-1.5'
const HIRE_COLS_SAME = 'grid grid-cols-[140px_140px_minmax(160px,1fr)_32px] gap-1.5'
const cell = 'border border-border rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-accent w-full'
const cellErr = 'border border-red-400 rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-red-500 w-full'
const lbl = 'text-[10.5px] font-semibold uppercase tracking-wide text-ink-4'

// ─── Table headers ───────────────────────────────────────────────────────────
function TaxiBookingTableHeader() {
  return (
    <div className={`${TAXI_COLS} items-center px-3 py-2 bg-bg border-b border-border rounded-t-lg`}>
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

function VehicleHireTableHeader({ vehicleMode }: { vehicleMode: VehicleMode }) {
  const cols = vehicleMode === 'same' ? HIRE_COLS_SAME : HIRE_COLS_INDIVIDUAL
  return (
    <div className={`${cols} items-center px-3 py-2 bg-bg border-b border-border rounded-t-lg`}>
      <span className={lbl}>Start Date <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>End Date <span className="text-red-400 normal-case font-normal">*</span></span>
      {vehicleMode === 'individual' && (
        <span className={lbl}>Vehicle <span className="text-red-400 normal-case font-normal">*</span></span>
      )}
      <span className={lbl}>Notes</span>
      <span />
    </div>
  )
}

// ─── Taxi Booking Table Row ──────────────────────────────────────────────────
function TaxiBookingTableRow({
  row, vehicles, clients, errors, showErrors, isLast,
  onChange, onDelete,
}: {
  row: TaxiBookingRow
  vehicles: Vehicle[]
  clients: Client[]
  errors: Record<string, boolean>
  showErrors: boolean
  isLast: boolean
  onChange: (updated: TaxiBookingRow) => void
  onDelete: () => void
}) {
  function set<K extends keyof TaxiBookingRow>(key: K, val: TaxiBookingRow[K]) {
    onChange({ ...row, [key]: val })
  }
  const c = (err: boolean) => err ? cellErr : cell

  return (
    <div className={`${TAXI_COLS} items-center px-3 py-1.5 bg-white hover:bg-bg/30 transition-colors ${isLast ? 'rounded-b-lg' : 'border-b border-border'}`}>
      <span className="text-[12.5px] font-medium text-ink truncate pr-1">{formatDateLabel(row.date)}</span>

      <select value={row.service_type}
        onChange={e => onChange({ ...row, service_type: e.target.value as ServiceType, vehicle_id: '' })}
        className={cell}>
        {SERVICE_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
      </select>

      {row.service_type === 'vehicle' ? (
        <select value={row.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
          className={c(showErrors && errors.vehicle_id)}>
          <option value="">— select —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers})` : ''}</option>)}
        </select>
      ) : (
        <span className="text-[12px] text-ink-4 px-2 select-none">—</span>
      )}

      <input type="text" value={row.pickup_address}
        onChange={e => set('pickup_address', e.target.value)}
        placeholder="Pickup address"
        className={c(showErrors && errors.pickup_address)} />

      <input type="time" value={row.pickup_time}
        onChange={e => set('pickup_time', e.target.value)}
        className={c(showErrors && errors.pickup_time)} />

      <input type="number" min={1} value={row.passengers}
        onChange={e => set('passengers', e.target.value)}
        className={c(showErrors && errors.passengers)} />

      <input type="text" value={row.destination}
        onChange={e => set('destination', e.target.value)}
        placeholder="optional"
        className={cell} />

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

      <select value={row.vendor_client_id}
        onChange={e => set('vendor_client_id', e.target.value)}
        className={cell}>
        <option value="">— optional —</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.reference ? ` (${c.reference})` : ''}</option>)}
      </select>

      <input type="text" value={row.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder="optional"
        className={cell} />

      <button onClick={onDelete} aria-label="Remove booking"
        className="flex items-center justify-center text-ink-4 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Vehicle Hire Booking Table Row ──────────────────────────────────────────
function VehicleHireBookingTableRow({
  row, vehicles, errors, showErrors, isLast, vehicleMode,
  onChange, onDelete,
}: {
  row: VehicleHireRow
  vehicles: Vehicle[]
  errors: Record<string, boolean>
  showErrors: boolean
  isLast: boolean
  vehicleMode: VehicleMode
  onChange: (updated: VehicleHireRow) => void
  onDelete: () => void
}) {
  function set<K extends keyof VehicleHireRow>(key: K, val: VehicleHireRow[K]) {
    onChange({ ...row, [key]: val })
  }
  const c = (err: boolean) => err ? cellErr : cell
  const cols = vehicleMode === 'same' ? HIRE_COLS_SAME : HIRE_COLS_INDIVIDUAL

  return (
    <div className={`${cols} items-center px-3 py-1.5 bg-white hover:bg-bg/30 transition-colors ${isLast ? 'rounded-b-lg' : 'border-b border-border'}`}>
      <input type="date" value={row.start_date}
        onChange={e => set('start_date', e.target.value)}
        className={c(showErrors && errors.start_date)} />

      <input type="date" value={row.end_date}
        onChange={e => set('end_date', e.target.value)}
        className={c(showErrors && errors.end_date)} />

      {vehicleMode === 'individual' && (
        <select value={row.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
          className={c(showErrors && errors.vehicle_id)}>
          <option value="">— select —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers})` : ''}</option>)}
        </select>
      )}

      <input type="text" value={row.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder="optional"
        className={cell} />

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [taxiEnabled, setTaxiEnabled] = useState(false)
  const [vehicleHireEnabled, setVehicleHireEnabled] = useState(true)

  const [tripMode, setTripMode] = useState<TripMode>('taxi')
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('same')
  const [sameVehicleId, setSameVehicleId] = useState('')
  const [rows, setRows] = useState<BookingRow[]>([])
  const [authorisedBy, setAuthorisedBy] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [showAuthorisedByError, setShowAuthorisedByError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [successResult, setSuccessResult] = useState<{ created: number; enquiries: number; errors: string[] } | null>(null)
  // Conflict enquiry prompt — holds the indices of conflicting bookings
  const [conflictPrompt, setConflictPrompt] = useState<{ indices: number[]; rows: BookingRow[] } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/vehicles').then(r => r.json()),
      fetch('/api/vendor/clients').then(r => r.json()),
      fetch('/api/vendor/bookings').then(r => r.json()),
      fetch('/api/vendor/settings').then(r => r.json()),
    ]).then(([v, c, b, s]) => {
      setVehicles(v.vehicles ?? [])
      setClients(c.clients ?? [])
      setExistingBookings(b.bookings ?? [])
      const taxi = Boolean(s.taxi_enabled)
      const hire = s.vehicle_hire_enabled !== false
      setTaxiEnabled(taxi)
      setVehicleHireEnabled(hire)
      // Default to whichever mode is enabled; prefer vehicle_hire if both enabled
      setTripMode(hire ? 'vehicle_hire' : 'taxi')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function handleDayClick(date: string) {
    const newRow = tripMode === 'vehicle_hire' ? makeVehicleHireRow(date) : makeTaxiRow(date)
    setRows(prev => [...prev, newRow])
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
    if (tripMode === 'vehicle_hire') {
      const hireRow = row as VehicleHireRow
      return {
        start_date: !hireRow.start_date,
        end_date: !hireRow.end_date,
        vehicle_id: vehicleMode === 'individual' && !hireRow.vehicle_id,
      }
    } else {
      const taxiRow = row as TaxiBookingRow
      return {
        pickup_address: !taxiRow.pickup_address.trim(),
        pickup_time: !taxiRow.pickup_time,
        passengers: isNaN(parseInt(taxiRow.passengers)) || parseInt(taxiRow.passengers) < 1,
        vehicle_id: taxiRow.service_type === 'vehicle' && !taxiRow.vehicle_id,
      }
    }
  }

  const rowsValid = rows.length > 0 && rows.every(r => {
    if (tripMode === 'vehicle_hire') return isVehicleHireRowValid(r as VehicleHireRow, vehicleMode)
    return isTaxiRowValid(r as TaxiBookingRow)
  })

  const vehicleValid = tripMode !== 'vehicle_hire' || vehicleMode !== 'same' || sameVehicleId.length > 0
  const authorisedByValid = authorisedBy.trim().length > 0
  const allValid = rowsValid && vehicleValid && authorisedByValid

  // Existing bookings formatted for MultiDayPicker
  const pickerBookings = existingBookings.map(b => ({
    date: b.start_date,
    status: b.status,
    public_id: b.public_id,
  }))

  function buildBookingPayloads(rowsToSend: BookingRow[], asEnquiry = false) {
    return rowsToSend.map((row) => {
      if (tripMode === 'vehicle_hire') {
        const hireRow = row as VehicleHireRow
        const resolvedVehicleId = vehicleMode === 'same' ? sameVehicleId : hireRow.vehicle_id
        return {
          service_type: 'vehicle' as const,
          start_date: hireRow.start_date,
          end_date: hireRow.end_date,
          vehicle_id: resolvedVehicleId,
          trip_details: JSON.stringify({ notes: hireRow.notes || null }),
          ...(asEnquiry ? { is_enquiry: true } : {}),
        }
      } else {
        const taxiRow = row as TaxiBookingRow
        const trip_details = JSON.stringify({
          pickup_address: taxiRow.pickup_address,
          pickup_time: taxiRow.pickup_time,
          passengers: parseInt(taxiRow.passengers),
          destination: taxiRow.destination || null,
          return_trip: taxiRow.return_trip,
          return_time: taxiRow.return_trip ? taxiRow.return_time : null,
          notes: taxiRow.notes || null,
        })
        const payload: Record<string, unknown> = {
          service_type: taxiRow.service_type,
          start_date: taxiRow.date,
          end_date: taxiRow.date,
          trip_details,
          ...(asEnquiry ? { is_enquiry: true } : {}),
        }
        if (taxiRow.service_type === 'vehicle' && taxiRow.vehicle_id) {
          payload.vehicle_id = taxiRow.vehicle_id
        }
        if (taxiRow.vendor_client_id) {
          payload.vendor_client_id = taxiRow.vendor_client_id
        }
        return payload as {
          service_type: ServiceType
          start_date: string
          end_date: string
          vehicle_id?: string
          vendor_client_id?: string
          trip_details: string
          is_enquiry?: boolean
        }
      }
    })
  }

  async function handleSubmit() {
    if (!authorisedBy.trim()) {
      setShowAuthorisedByError(true)
      return
    }
    if (!allValid) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    setConflictPrompt(null)
    setProgress('Submitting bookings…')
    try {
      const bookings = buildBookingPayloads(rows)
      const res = await fetch('/api/vendor/bookings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings, authorised_by: authorisedBy, trip_mode: tripMode }),
      })
      const d = await res.json()

      // Detect which failures are due to date conflicts
      const allErrors: string[] = d.errors ?? []
      const conflictErrors = allErrors.filter((e: string) => /already booked/i.test(e))
      const conflictIndices = conflictErrors
        .map((e: string) => { const m = e.match(/Booking (\d+) failed/); return m ? parseInt(m[1]) - 1 : -1 })
        .filter((i: number) => i >= 0)

      const createdCount = d.created?.length ?? 0

      if (conflictIndices.length > 0) {
        const conflictRows = conflictIndices.map((i: number) => rows[i]).filter(Boolean)
        setConflictPrompt({ indices: conflictIndices, rows: conflictRows })
        if (createdCount > 0) {
          // Partial success — show what was created, keep conflict prompt for re-submission
          setSuccessResult({
            created: createdCount,
            enquiries: 0,
            errors: allErrors.filter((e: string) => !/already booked/i.test(e)),
          })
        }
        return
      }

      if (!res.ok && createdCount === 0) {
        throw new Error(d.error ?? allErrors[0] ?? 'Submission failed')
      }

      setSuccessResult({ created: createdCount, enquiries: 0, errors: allErrors })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'An error occurred.')
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  async function submitConflictsAsEnquiries() {
    if (!conflictPrompt) return
    setSubmitting(true)
    setSubmitError('')
    setProgress('Submitting waitlist enquiries…')
    try {
      const bookings = buildBookingPayloads(conflictPrompt.rows, true)
      const res = await fetch('/api/vendor/bookings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings, authorised_by: authorisedBy, trip_mode: tripMode }),
      })
      const d = await res.json()
      const enquiryCount = d.created?.length ?? 0
      const prevCreated = successResult?.created ?? 0
      setConflictPrompt(null)
      setSuccessResult({
        created: prevCreated,
        enquiries: enquiryCount,
        errors: successResult?.errors ?? [],
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit enquiries.')
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  function switchTripMode(mode: TripMode) {
    setTripMode(mode)
    setRows([])
    setShowErrors(false)
    setSubmitError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-ink-3 text-[14px]">Loading…</span>
      </div>
    )
  }

  if (successResult && !conflictPrompt) {
    const totalEnquiries = successResult.enquiries
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="bg-white border border-border rounded-2xl px-8 py-10 shadow-sm">
          <div className="w-14 h-14 bg-success-bg border border-success/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-success text-2xl font-bold">✓</span>
          </div>
          <h1 className="font-display font-bold text-[24px] tracking-tight mb-2">
            {successResult.created > 0
              ? `${successResult.created} Booking${successResult.created !== 1 ? 's' : ''} Confirmed`
              : totalEnquiries > 0
                ? `${totalEnquiries} Waitlist Enquir${totalEnquiries !== 1 ? 'ies' : 'y'} Submitted`
                : 'Submitted'}
          </h1>
          {successResult.created > 0 && (
            <p className="text-[14px] text-ink-3 mb-2">
              {successResult.created} booking{successResult.created !== 1 ? 's have' : ' has'} been confirmed.
            </p>
          )}
          {totalEnquiries > 0 && (
            <p className="text-[14px] text-ink-3 mb-2">
              {totalEnquiries} waitlist enquir{totalEnquiries !== 1 ? 'ies have' : 'y has'} been submitted — we&apos;ll be in touch if availability opens up.
            </p>
          )}
          {successResult.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 mb-6 mt-4 text-left">
              <p className="text-[12.5px] font-semibold text-yellow-800 mb-1">Some bookings could not be created:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {successResult.errors.map((e, i) => (
                  <li key={i} className="text-[12.5px] text-yellow-700">{e}</li>
                ))}
              </ul>
            </div>
          )}
          <a href="/vendor"
            className="inline-block mt-6 bg-accent text-white font-display font-bold text-[15px] px-8 py-3 rounded-lg hover:bg-accent-dark transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display font-bold text-[26px] tracking-tight">Book Multiple</h1>
          <p className="text-[14px] text-ink-3 mt-0.5">Select a booking type, click days on the calendar, then fill in the details.</p>
        </div>
        <Link href="/vendor/bookings"
          className="text-[13px] text-ink-3 hover:text-ink transition-colors mt-1 whitespace-nowrap">
          ← Back to bookings
        </Link>
      </div>

      {/* ── Trip Mode Toggle ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {taxiEnabled && (
          <button
            onClick={() => switchTripMode('taxi')}
            className={`px-6 py-3 rounded-lg font-display font-bold text-[15px] transition-all border-2 ${
              tripMode === 'taxi'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white text-ink-3 border-border hover:border-ink-4 hover:text-ink'
            }`}>
            Taxi Trips
          </button>
        )}
        {vehicleHireEnabled && (
          <button
            onClick={() => switchTripMode('vehicle_hire')}
            className={`px-6 py-3 rounded-lg font-display font-bold text-[15px] transition-all border-2 ${
              tripMode === 'vehicle_hire'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white text-ink-3 border-border hover:border-ink-4 hover:text-ink'
            }`}>
            Vehicle Hire
          </button>
        )}

        {/* Vehicle mode selector — only for Vehicle Hire */}
        {tripMode === 'vehicle_hire' && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <span className="text-[12px] font-semibold text-ink-4 uppercase tracking-wide">Vehicle:</span>
            <button
              onClick={() => setVehicleMode('same')}
              className={`px-3 py-1.5 rounded-[5px] text-[12.5px] font-semibold transition-colors ${
                vehicleMode === 'same'
                  ? 'bg-slate text-white'
                  : 'bg-bg text-ink-3 hover:text-ink'
              }`}>
              Same for all
            </button>
            <button
              onClick={() => setVehicleMode('individual')}
              className={`px-3 py-1.5 rounded-[5px] text-[12.5px] font-semibold transition-colors ${
                vehicleMode === 'individual'
                  ? 'bg-slate text-white'
                  : 'bg-bg text-ink-3 hover:text-ink'
              }`}>
              Choose per row
            </button>
          </div>
        )}
      </div>

      {/* ── Same-vehicle picker (when vehicleMode === 'same') ──── */}
      {tripMode === 'vehicle_hire' && vehicleMode === 'same' && (
        <div className="mb-6 bg-white border border-border rounded-xl px-5 py-4">
          <label className="block text-[12.5px] font-semibold text-ink-3 mb-2">
            Vehicle for all bookings <span className="text-red-400">*</span>
          </label>
          <select
            value={sameVehicleId}
            onChange={e => setSameVehicleId(e.target.value)}
            className={`w-full max-w-md border rounded-[6px] px-3 py-2.5 text-[13.5px] focus:outline-none transition-all ${
              showErrors && !sameVehicleId
                ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                : 'border-border focus:ring-2 focus:ring-accent/30 focus:border-accent'
            }`}>
            <option value="">— Select a vehicle —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers} pax)` : ''}</option>
            ))}
          </select>
          {showErrors && !sameVehicleId && (
            <p className="text-[12px] text-red-600 mt-1.5">Please select a vehicle</p>
          )}
        </div>
      )}

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
          <div className="space-y-4">
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

            {/* Row count */}
            <p className="text-[13.5px] font-semibold text-ink">
              {rows.length} booking{rows.length !== 1 ? 's' : ''} queued
            </p>

            <div className={`overflow-x-auto rounded-lg border border-border ${tripMode === 'vehicle_hire' ? '' : ''}`}>
              <div className={tripMode === 'vehicle_hire' ? '' : 'min-w-[1150px]'}>
                {tripMode === 'vehicle_hire' ? (
                  <>
                    <VehicleHireTableHeader vehicleMode={vehicleMode} />
                    {rows.map((row, i) => (
                      <VehicleHireBookingTableRow
                        key={row._id}
                        row={row as VehicleHireRow}
                        vehicles={vehicles}
                        errors={getRowErrors(row)}
                        showErrors={showErrors}
                        isLast={i === rows.length - 1}
                        vehicleMode={vehicleMode}
                        onChange={updated => updateRow(row._id, updated)}
                        onDelete={() => deleteRow(row._id)}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <TaxiBookingTableHeader />
                    {rows.map((row, i) => (
                      <TaxiBookingTableRow
                        key={row._id}
                        row={row as TaxiBookingRow}
                        vehicles={vehicles}
                        clients={clients}
                        errors={getRowErrors(row)}
                        showErrors={showErrors}
                        isLast={i === rows.length - 1}
                        onChange={updated => updateRow(row._id, updated)}
                        onDelete={() => deleteRow(row._id)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Conflict / waitlist enquiry prompt */}
            {conflictPrompt && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M10 3L18 17H2L10 3Z" stroke="#B45309" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M10 9v4M10 14.5v.5" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold text-amber-900 mb-1">
                      {conflictPrompt.rows.length === 1
                        ? '1 date is already booked'
                        : `${conflictPrompt.rows.length} dates are already booked`}
                    </p>
                    <p className="text-[12.5px] text-amber-800 mb-3">
                      These dates aren&apos;t currently available, but you can join the waitlist. We&apos;ll contact you if a space opens up — no commitment is made until we confirm.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={submitConflictsAsEnquiries}
                        disabled={submitting}
                        className="bg-amber-700 text-white text-[12.5px] font-semibold px-4 py-2 rounded-[6px] hover:bg-amber-800 disabled:opacity-50 transition-colors">
                        {submitting ? progress || 'Submitting…' : `Submit ${conflictPrompt.rows.length} as Waitlist Enquir${conflictPrompt.rows.length !== 1 ? 'ies' : 'y'}`}
                      </button>
                      <button
                        onClick={() => setConflictPrompt(null)}
                        disabled={submitting}
                        className="text-[12.5px] text-amber-700 hover:text-amber-900 underline disabled:opacity-50">
                        No thanks
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Authorised By + Submit */}
            <div className="bg-white border border-border rounded-xl px-5 py-4 space-y-4">
              <div>
                <label htmlFor="authorised-by" className="block text-[12.5px] font-semibold text-ink-3 mb-2">
                  Authorised By <span className="text-red-400">*</span>
                </label>
                <input
                  id="authorised-by"
                  type="text"
                  value={authorisedBy}
                  onChange={e => {
                    setAuthorisedBy(e.target.value)
                    if (e.target.value.trim()) setShowAuthorisedByError(false)
                  }}
                  placeholder="Name of person authorising these bookings"
                  className={`w-full max-w-md border rounded-[6px] px-3 py-2.5 text-[13.5px] focus:outline-none transition-all ${
                    showAuthorisedByError && !authorisedBy.trim()
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                      : 'border-border focus:ring-2 focus:ring-accent/30 focus:border-accent'
                  }`}
                />
                {showAuthorisedByError && !authorisedBy.trim() && (
                  <p className="text-[12px] text-red-600 mt-1.5">Authorised By is required</p>
                )}
              </div>

              {!conflictPrompt && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-accent text-white font-display font-bold text-[15px] px-8 py-3 rounded-lg hover:bg-accent-dark disabled:opacity-50 transition-colors shadow-sm">
                  {submitting ? progress || 'Creating…' : `Confirm ${rows.length} Booking${rows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
