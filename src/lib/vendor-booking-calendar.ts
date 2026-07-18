import { query } from '@/lib/db'

const YMD = /^\d{4}-\d{2}-\d{2}$/
const MAX_WINDOW_DAYS = 93

export interface BookingCalendarWindow {
  start: string
  end: string
}

interface AvailabilityRow {
  kind: 'booking' | 'blockout'
  id: string
  public_id: string | null
  vendor_id: string | null
  vehicle_id: string | null
  vehicle_name: string | null
  start_date: string | Date
  end_date: string | Date
  status: string
}

function dateToYmd(value: string | Date): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

function isValidYmd(value: string): boolean {
  if (!YMD.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function getBookingCalendarWindow(requestUrl: string): BookingCalendarWindow {
  const url = new URL(requestUrl)
  const requestedStart = url.searchParams.get('start')
  const requestedEnd = url.searchParams.get('end')

  if (!requestedStart && !requestedEnd) {
    const today = new Date()
    return {
      start: new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)).toISOString().slice(0, 10),
      end: new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0)).toISOString().slice(0, 10),
    }
  }

  if (!requestedStart || !requestedEnd || !isValidYmd(requestedStart) || !isValidYmd(requestedEnd)) {
    throw new RangeError('start and end must be valid YYYY-MM-DD dates')
  }

  const startMs = new Date(`${requestedStart}T00:00:00Z`).getTime()
  const endMs = new Date(`${requestedEnd}T00:00:00Z`).getTime()
  const days = Math.floor((endMs - startMs) / 86_400_000) + 1
  if (days < 1 || days > MAX_WINDOW_DAYS) {
    throw new RangeError(`Availability windows must be between 1 and ${MAX_WINDOW_DAYS} days`)
  }

  return { start: requestedStart, end: requestedEnd }
}

export async function getVendorBookingCalendarData(
  vendorId: string,
  window: BookingCalendarWindow
) {
  // A single bounded query supplies the vendor's calendar dots, global vehicle
  // availability and vehicle blockouts without exposing another vendor's reference.
  const rows = await query<AvailabilityRow>(
    `SELECT
       'booking' AS kind,
       b.id,
       b.public_id,
       b.vendor_id,
       b.vehicle_id,
       v.name AS vehicle_name,
       b.start_date,
       b.end_date,
       b.status
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.start_date <= ?
       AND b.end_date >= ?
       AND (
         (b.vehicle_id IS NOT NULL AND b.status NOT IN ('cancelled', 'enquiry'))
         OR b.vendor_id = ?
       )

     UNION ALL

     SELECT
       'blockout' AS kind,
       vb.id,
       NULL AS public_id,
       NULL AS vendor_id,
       vb.vehicle_id,
       v.name AS vehicle_name,
       vb.start_date,
       vb.end_date,
       'confirmed' AS status
     FROM VehicleBlockout vb
     LEFT JOIN Vehicle v ON vb.vehicle_id = v.id
     WHERE vb.start_date <= ?
       AND vb.end_date >= ?

     ORDER BY start_date ASC
     LIMIT 5000`,
    [window.end, window.start, vendorId, window.end, window.start]
  )

  const bookings = rows
    .filter((row) => (
      row.kind === 'booking'
      && row.vehicle_id !== null
      && row.vehicle_name !== null
      && row.status !== 'cancelled'
      && row.status !== 'enquiry'
    ))
    .map((row) => {
      const startDate = dateToYmd(row.start_date)
      const endDate = dateToYmd(row.end_date)
      return {
        vehicle_id: row.vehicle_id as string,
        vehicle_name: row.vehicle_name as string,
        // Clip long-running bookings to the requested window so a single unusual
        // record cannot make the client expand years of dates on every render.
        start_date: startDate < window.start ? window.start : startDate,
        end_date: endDate > window.end ? window.end : endDate,
        status: row.status,
      }
    })

  const blockouts = rows
    .filter((row) => row.kind === 'blockout')
    .map((row) => {
      const startDate = dateToYmd(row.start_date)
      const endDate = dateToYmd(row.end_date)
      return {
        vehicle_id: row.vehicle_id,
        vehicle_name: row.vehicle_name,
        start_date: startDate < window.start ? window.start : startDate,
        end_date: endDate > window.end ? window.end : endDate,
      }
    })

  const ownBookings = rows
    .filter((row) => row.kind === 'booking' && row.vendor_id === vendorId)
    .map((row) => ({
      id: row.id,
      public_id: row.public_id ?? '',
      status: row.status,
      start_date: dateToYmd(row.start_date),
      end_date: dateToYmd(row.end_date),
      vehicle_id: row.vehicle_id,
      vehicle_name: row.vehicle_name,
    }))

  return { bookings, blockouts, own_bookings: ownBookings, window }
}
