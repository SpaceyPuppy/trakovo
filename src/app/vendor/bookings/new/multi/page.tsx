'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MultiDayPicker from '@/components/vendor/MultiDayPicker'

type ServiceType = 'taxi' | 'cpv' | 'vehicle'
type TripMode = 'taxi' | 'vehicle_hire'

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
  vendor_client_id: string
  notes: string
}

type BookingRow = TaxiBookingRow | VehicleHireRow

function isTaxiRow(row: BookingRow): row is TaxiBookingRow {
  return 'date' in row && 'pickup_address' in row
}

function isVehicleHireRow(row: BookingRow): row is VehicleHireRow {
  return 'start_date' in row && !('pickup_address' in row)
}

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
    vendor_client_id: '',
    notes: '',
  }
}

function formatDateLabel(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isRowValid(row: BookingRow, tripMode: TripMode): boolean {
  if (tripMode === 'vehicle_hire') {
    const hireRow = row as VehicleHireRow
    return hireRow.vehicle_id.length > 0 && hireRow.start_date.length > 0 && hireRow.end_date.length > 0
  } else {
    const taxiRow = row as TaxiBookingRow
    return (
      taxiRow.pickup_address.trim().length > 0 &&
      taxiRow.pickup_time.length > 0 &&
      parseInt(taxiRow.passengers) >= 1 &&
      (taxiRow.service_type !== 'vehicle' || taxiRow.vehicle_id.length > 0)
    )
  }
}

const SERVICE_OPTIONS: { type: ServiceType; label: string }[] = [
  { type: 'taxi',    label: 'Taxi' },
  { type: 'cpv',     label: 'CPV' },
  { type: 'vehicle', label: 'Specific Vehicle' },
]

// Column grids — matches header and row for each mode
const TAXI_COLS = 'grid grid-cols-[108px_88px_130px_minmax(160px,1fr)_86px_52px_110px_140px_120px_110px_32px] gap-1.5'
const VEHICLE_HIRE_COLS = 'grid grid-cols-[140px_140px_130px_120px_minmax(160px,1fr)_32px] gap-1.5'
const cell = 'border border-border rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-accent w-full'
const cellErr = 'border border-red-400 rounded-[5px] px-2 py-1.5 text-[12.5px] bg-white focus:outline-none focus:border-red-500 w-full'
const lbl = 'text-[10.5px] font-semibold uppercase tracking-wide text-ink-4'

// ─── Table header ─────────────────────────────────────────────────────────────
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

function VehicleHireBookingTableHeader() {
  return (
    <div className={`${VEHICLE_HIRE_COLS} items-center px-3 py-2 bg-bg border-b border-border rounded-t-lg`}>
      <span className={lbl}>Start Date <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>End Date <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>Vehicle <span className="text-red-400 normal-case font-normal">*</span></span>
      <span className={lbl}>Client</span>
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

// ─── Vehicle Hire Booking Table Row ──────────────────────────────────────────
function VehicleHireBookingTableRow({
  row, vehicles, clients, errors, showErrors, isLast,
  onChange, onDelete,
}: {
  row: VehicleHireRow
  vehicles: Vehicle[]
  clients: Client[]
  errors: Record<string, boolean>
  showErrors: boolean
  isLast: boolean
  onChange: (updated: VehicleHireRow) => void
  onDelete: () => void
}) {
  function set<K extends keyof VehicleHireRow>(key: K, val: VehicleHireRow[K]) {
    onChange({ ...row, [key]: val })
  }
  const c = (err: boolean) => err ? cellErr : cell

  return (
    <div className={`${VEHICLE_HIRE_COLS} items-center px-3 py-1.5 bg-white hover:bg-bg/30 transition-colors ${isLast ? 'rounded-b-lg' : 'border-b border-border'}`}>
      {/* Start Date */}
      <input type="date" value={row.start_date}
        onChange={e => set('start_date', e.target.value)}
        className={c(showErrors && errors.start_date)} />

      {/* End Date */}
      <input type="date" value={row.end_date}
        onChange={e => set('end_date', e.target.value)}
        className={c(showErrors && errors.end_date)} />

      {/* Vehicle */}
      <select value={row.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
        className={c(showErrors && errors.vehicle_id)}>
        <option value="">— select —</option>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.passengers > 0 ? ` (${v.passengers})` : ''}</option>)}
      </select>

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

  const [tripMode, setTripMode] = useState<TripMode>('taxi')
  const [rows, setRows] = useState<BookingRow[]>([])
  const [authorisedBy, setAuthorisedBy] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [showAuthorisedByError, setShowAuthorisedByError] = useState(false)
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
        vehicle_id: !hireRow.vehicle_id,
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

  const allValid = rows.length > 0 && rows.every(r => isRowValid(r, tripMode)) && authorisedBy.trim().length > 0

  // Existing bookings formatted for MultiDayPicker
  const pickerBookings = existingBookings.map(b => ({
    date: b.start_date,
    status: b.status,
    public_id: b.public_id,
  }))

  async function handleSubmit() {
    if (!allValid) {
      setShowErrors(true)
      if (!authorisedBy.trim()) {
        setShowAuthorisedByError(true)
      }
      return
    }
    setSubmitting(true)
    setSubmitError('')
    setProgress(`Creating ${rows.length} booking${rows.length !== 1 ? 's' : ''}…`)

    try {
      const bookings = rows.map((row) => {
        if (tripMode === 'vehicle_hire') {
          const hireRow = row as VehicleHireRow
          return {
            service_type: 'vehicle' as const,
            start_date: hireRow.start_date,
            end_date: hireRow.end_date,
            vehicle_id: hireRow.vehicle_id,
            vendor_client_id: hireRow.vendor_client_id || undefined,
            trip_details: JSON.stringify({ notes: hireRow.notes || null }),
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
          }
        }
      })

      const res = await fetch('/api/vendor/bookings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings,
          authorised_by: authorisedBy,
          trip_mode: tripMode,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        throw new Error(d.error ?? 'Submission failed')
      }
      const created = d.created?.length ?? 0
      router.push(`/vendor/bookings?created=${created}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'An error occurred.')
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
        {/* Trip Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTripMode('taxi')
              setRows([])
              setShowErrors(false)
            }}
            className={`px-4 py-2.5 rounded-[6px] font-display font-bold text-[13px] transition-colors ${
              tripMode === 'taxi'
                ? 'bg-accent text-white'
                : 'bg-white border border-border text-ink-3 hover:bg-bg'
            }`}>
            Taxi Trips
          </button>
          <button
            onClick={() => {
              setTripMode('vehicle_hire')
              setRows([])
              setShowErrors(false)
            }}
            className={`px-4 py-2.5 rounded-[6px] font-display font-bold text-[13px] transition-colors ${
              tripMode === 'vehicle_hire'
                ? 'bg-accent text-white'
                : 'bg-white border border-border text-ink-3 hover:bg-bg'
            }`}>
            Vehicle Hire
          </button>
        </div>

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

            {/* Authorised By field */}
            {rows.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="authorised-by" className="block text-[12.5px] font-semibold text-ink-3">
                  Authorised By <span className="text-red-400 normal-case font-normal">*</span>
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
                  className={`w-full border rounded-[6px] px-3 py-2.5 text-[13.5px] focus:outline-none transition-all ${
                    showAuthorisedByError && !authorisedBy.trim()
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                      : 'border-border focus:ring-2 focus:ring-accent/30 focus:border-accent'
                  }`}
                />
                {showAuthorisedByError && !authorisedBy.trim() && (
                  <p className="text-[12px] text-red-600">Authorised By is required</p>
                )}
              </div>
            )}

            <div className={`overflow-x-auto rounded-lg border border-border ${tripMode === 'vehicle_hire' ? '' : 'min-w-max'}`}>
              <div className={tripMode === 'vehicle_hire' ? '' : `min-w-[1150px]`}>
                {tripMode === 'vehicle_hire' ? (
                  <>
                    <VehicleHireBookingTableHeader />
                    {rows.map((row, i) => {
                      const hireRow = row as VehicleHireRow
                      return (
                        <VehicleHireBookingTableRow
                          key={row._id}
                          row={hireRow}
                          vehicles={vehicles}
                          clients={clients}
                          errors={getRowErrors(row)}
                          showErrors={showErrors}
                          isLast={i === rows.length - 1}
                          onChange={updated => updateRow(row._id, updated as BookingRow)}
                          onDelete={() => deleteRow(row._id)}
                        />
                      )
                    })}
                  </>
                ) : (
                  <>
                    <TaxiBookingTableHeader />
                    {rows.map((row, i) => {
                      const taxiRow = row as TaxiBookingRow
                      return (
                        <TaxiBookingTableRow
                          key={row._id}
                          row={taxiRow}
                          vehicles={vehicles}
                          clients={clients}
                          errors={getRowErrors(row)}
                          showErrors={showErrors}
                          isLast={i === rows.length - 1}
                          onChange={updated => updateRow(row._id, updated as BookingRow)}
                          onDelete={() => deleteRow(row._id)}
                        />
                      )
                    })}
                  </>
                )}
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
