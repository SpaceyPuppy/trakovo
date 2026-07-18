import type { DbTransaction } from './db'
import type { HireMode, HireType } from '@/types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export type BookingValidationCode =
  | 'INVALID_REQUEST'
  | 'INVALID_DATE'
  | 'VEHICLE_NOT_FOUND'
  | 'VEHICLE_UNAVAILABLE'
  | 'VEHICLE_ACCESS_DENIED'
  | 'HIRE_MODE_UNAVAILABLE'
  | 'BOOKING_CONFLICT'
  | 'BLOCKOUT_CONFLICT'
  | 'VENDOR_CLIENT_FORBIDDEN'

export class BookingValidationError extends Error {
  readonly name = 'BookingValidationError'

  constructor(
    readonly code: BookingValidationCode,
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

export interface BookingDateRange {
  startDate: string
  endDate: string
  totalDays: number
}

export interface LockedBookingVehicle {
  id: string
  name: string
  currency: string
  price: number
  chauffeur_price: number
  day_rates: string | null
  hire_modes: HireMode
}

interface BookingVehicleValidationBase {
  vehicleId: string
  startDate: unknown
  endDate: unknown
  isEnquiry: boolean
  checkConflicts?: boolean
  excludeBookingId?: string
}

type BookingVehicleValidationInput = BookingVehicleValidationBase & (
  | { channel: 'public'; hireType: HireType }
  | { channel: 'vendor'; vendorId: string; hireType: 'chauffeured' }
  | { channel: 'admin'; hireType: HireType }
)

interface LockedVehicleRow extends LockedBookingVehicle {
  is_available: number
  public_bookings_enabled: number
  vendor_bookings_enabled: number
}

export function normaliseBookingCurrency(value: unknown): string {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{3}$/.test(currency) ? currency : 'AUD'
}

function parseIsoDate(value: unknown, field: 'start_date' | 'end_date'): Date {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new BookingValidationError('INVALID_DATE', `${field} must use YYYY-MM-DD format`, 400)
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BookingValidationError('INVALID_DATE', `${field} is not a valid date`, 400)
  }
  return parsed
}

export function validateBookingDateRange(startDate: unknown, endDate: unknown): BookingDateRange {
  const start = parseIsoDate(startDate, 'start_date')
  const end = parseIsoDate(endDate, 'end_date')
  if (end.getTime() < start.getTime()) {
    throw new BookingValidationError('INVALID_DATE', 'end_date must be on or after start_date', 400)
  }

  return {
    startDate: startDate as string,
    endDate: endDate as string,
    totalDays: Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  }
}

function assertHireMode(vehicle: LockedVehicleRow, hireType: HireType): void {
  if (hireType === 'dry-hire' && vehicle.hire_modes !== 'both') {
    throw new BookingValidationError(
      'HIRE_MODE_UNAVAILABLE',
      'Vehicle does not support self-drive bookings',
      409
    )
  }
  if (hireType === 'chauffeured' && !['chauffeured_only', 'both'].includes(vehicle.hire_modes)) {
    throw new BookingValidationError(
      'HIRE_MODE_UNAVAILABLE',
      'Vehicle does not support chauffeured bookings',
      409
    )
  }
}

export async function lockAndValidateBookingVehicle(
  transaction: DbTransaction,
  input: BookingVehicleValidationInput
): Promise<{ vehicle: LockedBookingVehicle; dateRange: BookingDateRange }> {
  const dateRange = validateBookingDateRange(input.startDate, input.endDate)
  const vehicle = await transaction.queryOne<LockedVehicleRow>(
    `SELECT id, name, currency, price, chauffeur_price, day_rates, hire_modes, is_available,
            public_bookings_enabled, vendor_bookings_enabled
     FROM Vehicle
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [input.vehicleId]
  )

  if (!vehicle) {
    throw new BookingValidationError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404)
  }
  if (!Boolean(vehicle.is_available)) {
    throw new BookingValidationError('VEHICLE_UNAVAILABLE', 'Vehicle is not currently available', 409)
  }

  if (input.channel === 'public') {
    if (!Boolean(vehicle.public_bookings_enabled)) {
      throw new BookingValidationError(
        'VEHICLE_ACCESS_DENIED',
        'Vehicle is not available for public booking',
        403
      )
    }
  } else if (input.channel === 'vendor') {
    if (!Boolean(vehicle.vendor_bookings_enabled)) {
      throw new BookingValidationError(
        'VEHICLE_ACCESS_DENIED',
        'Vehicle is not available for vendor booking',
        403
      )
    }
    const vendorAccess = await transaction.queryOne<{ is_enabled: number }>(
      `SELECT is_enabled
       FROM VendorVehicle
       WHERE vendor_id = ? AND vehicle_id = ?
       LIMIT 1
       FOR UPDATE`,
      [input.vendorId, input.vehicleId]
    )
    if (!vendorAccess || !Boolean(vendorAccess.is_enabled)) {
      throw new BookingValidationError(
        'VEHICLE_ACCESS_DENIED',
        'Vehicle not available for your account',
        403
      )
    }
  }

  assertHireMode(vehicle, input.hireType)

  if (input.checkConflicts ?? !input.isEnquiry) {
    const conflict = await transaction.queryOne<{ id: string }>(
      `SELECT id
       FROM Booking
       WHERE vehicle_id = ?
         AND status IN ('pending', 'confirmed')
         AND id <> ?
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1
       FOR UPDATE`,
      [vehicle.id, input.excludeBookingId ?? '', dateRange.endDate, dateRange.startDate]
    )
    if (conflict) {
      throw new BookingValidationError(
        'BOOKING_CONFLICT',
        `Vehicle is already booked for ${dateRange.startDate} to ${dateRange.endDate}`,
        409
      )
    }

    const blockout = await transaction.queryOne<{ id: string }>(
      `SELECT id
       FROM VehicleBlockout
       WHERE (vehicle_id IS NULL OR vehicle_id = ?)
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1
       FOR UPDATE`,
      [vehicle.id, dateRange.endDate, dateRange.startDate]
    )
    if (blockout) {
      throw new BookingValidationError(
        'BLOCKOUT_CONFLICT',
        `Vehicle is blocked for ${dateRange.startDate} to ${dateRange.endDate}`,
        409
      )
    }
  }

  return {
    vehicle: {
      id: vehicle.id,
      name: vehicle.name,
      currency: normaliseBookingCurrency(vehicle.currency),
      price: vehicle.price,
      chauffeur_price: vehicle.chauffeur_price,
      day_rates: vehicle.day_rates,
      hire_modes: vehicle.hire_modes,
    },
    dateRange,
  }
}
