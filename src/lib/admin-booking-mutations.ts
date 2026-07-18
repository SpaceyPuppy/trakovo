import { deleteCalendarEvent, syncBookingToCalendar } from './calendar'
import {
  BookingValidationError,
  lockAndValidateBookingVehicle,
  normaliseBookingCurrency,
  validateBookingDateRange,
} from './booking-availability'
import { generatePublicId, newId, queryOne, withTransaction } from './db'
import { sendBookingConfirmed } from './email-sequences'
import { getDailyRate } from './utils'
import {
  runIdempotently,
  type IdempotencyInput,
  type IdempotentResult,
} from './billing/idempotency'

const MAX_VARCHAR_LENGTH = 191
// MySQL TEXT is limited by bytes; 16k characters remains safe for utf8mb4.
const MAX_TEXT_LENGTH = 16_000
const MAX_SIGNED_INT = 2_147_483_647
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+() .-]{3,50}$/

const SERVICE_TYPES = new Set(['vehicle', 'taxi', 'cpv'])
const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled'])
const QUICK_ADD_STATUSES = new Set(['pending', 'confirmed', 'completed'])
const ENQUIRY_ACTIONS = new Set(['contacted', 'converted', 'lost'])

type ServiceType = 'vehicle' | 'taxi' | 'cpv'
type HireType = 'chauffeured' | 'dry-hire'
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type EnquiryAction = 'contacted' | 'converted' | 'lost'

export class AdminBookingMutationError extends Error {
  readonly name = 'AdminBookingMutationError'

  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export interface BookingMutationSideEffects {
  bookingId: string
  calendar: 'none' | 'sync' | 'delete'
  sendConfirmation: boolean
}

interface BookingMutationRow {
  id: string
  public_id: string
  vehicle_id: string | null
  hire_type: string
  service_type: string
  status: string
  start_date: string
  end_date: string
  contact_name: string | null
  contact_email: string
  contact_phone: string
  is_enquiry: number
  enquiry_status: string | null
  [key: string]: unknown
}

interface BookingAvailabilitySnapshot {
  id: string
  vehicle_id: string | null
  hire_type: string
  start_date: string
  end_date: string
}

interface DayRateRow {
  days_from: number
  days_to: number | null
  price: number
  chauffeur_price: number
}

export interface AdminEnquiryNotificationBooking {
  id: string
  public_id: string
  status: string
  hire_type: string
  is_enquiry: number
  start_date: string
  end_date: string
  total_days: number
  daily_rate: number
  total_cost: number
  contact_name: string | null
  contact_email: string
  contact_phone: string
  driver_name: string | null
  driver_dob: string | null
  driver_licence_number: string | null
  driver_licence_expiry: string | null
  vehicle_name: string | null
  created_at: Date
}

export interface CreatedAdminBooking {
  id: string
  public_id: string
  sideEffects: BookingMutationSideEffects
}

export interface UpdatedAdminBooking {
  booking: BookingMutationRow
  sideEffects: BookingMutationSideEffects
}

export interface AdminBlockout {
  id: string
  vehicle_id: string | null
  start_date: string
  end_date: string
  reason: string
  created_at: Date
  vehicle_name: string | null
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AdminBookingMutationError('Request body must be a JSON object', 400)
  }
  return value as Record<string, unknown>
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new AdminBookingMutationError(`${field} must be a string`, 400)
  }
  const result = value.trim()
  if (!result || result.length > MAX_VARCHAR_LENGTH) {
    throw new AdminBookingMutationError(`${field} is invalid`, 400)
  }
  return result
}

function requiredId(value: unknown, field: string): string {
  const result = optionalId(value, field)
  if (!result) throw new AdminBookingMutationError(`${field} is required`, 400)
  return result
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new AdminBookingMutationError(`${field} must be text`, 400)
  }
  const result = value.trim()
  if (!result) return null
  if (result.length > maxLength) {
    throw new AdminBookingMutationError(`${field} is too long`, 400)
  }
  return result
}

function requiredContact(value: unknown, field: 'contact_email' | 'contact_phone'): string {
  if (typeof value !== 'string') {
    throw new AdminBookingMutationError(`${field} is required`, 400)
  }
  const result = value.trim()
  if (!result || result.length > MAX_VARCHAR_LENGTH) {
    throw new AdminBookingMutationError(`${field} is invalid`, 400)
  }
  if (field === 'contact_email' && !EMAIL_PATTERN.test(result)) {
    throw new AdminBookingMutationError('contact_email is invalid', 400)
  }
  if (field === 'contact_phone' && !PHONE_PATTERN.test(result)) {
    throw new AdminBookingMutationError('contact_phone is invalid', 400)
  }
  return field === 'contact_email' ? result.toLowerCase() : result
}

function validateStoredContact(booking: Pick<BookingMutationRow, 'contact_email' | 'contact_phone'>): void {
  requiredContact(booking.contact_email, 'contact_email')
  requiredContact(booking.contact_phone, 'contact_phone')
}

function normaliseServiceType(value: unknown): ServiceType {
  const result = value ?? 'vehicle'
  if (typeof result !== 'string' || !SERVICE_TYPES.has(result)) {
    throw new AdminBookingMutationError('Invalid service_type', 400)
  }
  return result as ServiceType
}

function normaliseHireType(value: unknown, serviceType: ServiceType): HireType {
  if (serviceType !== 'vehicle') return 'chauffeured'
  if (value === undefined || value === null || value === '') return 'chauffeured'
  if (value !== 'chauffeured' && value !== 'dry-hire') {
    throw new AdminBookingMutationError('Invalid hire_type', 400)
  }
  return value
}

function normaliseQuickAddStatus(value: unknown): BookingStatus {
  const result = value ?? 'confirmed'
  if (typeof result !== 'string' || !QUICK_ADD_STATUSES.has(result)) {
    throw new AdminBookingMutationError('Invalid status', 400)
  }
  return result as BookingStatus
}

function normaliseStatus(value: unknown): BookingStatus {
  if (typeof value !== 'string' || !BOOKING_STATUSES.has(value)) {
    throw new AdminBookingMutationError('Invalid status', 400)
  }
  return value as BookingStatus
}

function normaliseEnquiryAction(value: unknown): EnquiryAction {
  if (typeof value !== 'string' || !ENQUIRY_ACTIONS.has(value)) {
    throw new AdminBookingMutationError('Invalid action', 400)
  }
  return value as EnquiryAction
}

function parseDayRates(value: string | null): DayRateRow[] {
  if (!value) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((rate): rate is DayRateRow => {
    if (!rate || typeof rate !== 'object') return false
    const row = rate as Record<string, unknown>
    return Number.isInteger(row.days_from)
      && (row.days_to === null || Number.isInteger(row.days_to))
      && Number.isInteger(row.price)
      && Number.isInteger(row.chauffeur_price)
  })
}

function centsFromOverride(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new AdminBookingMutationError('daily_rate_override must be a non-negative number', 400)
  }
  const cents = Math.round(value * 100)
  if (!Number.isSafeInteger(cents) || cents > MAX_SIGNED_INT) {
    throw new AdminBookingMutationError('daily_rate_override is too large', 400)
  }
  return cents
}

function assertMoneyFits(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SIGNED_INT) {
    throw new AdminBookingMutationError(`${field} is outside the supported range`, 400)
  }
}

function assertSnapshotUnchanged(
  current: BookingMutationRow,
  snapshot: BookingAvailabilitySnapshot
): void {
  if (
    current.vehicle_id !== snapshot.vehicle_id
    || current.hire_type !== snapshot.hire_type
    || current.start_date !== snapshot.start_date
    || current.end_date !== snapshot.end_date
  ) {
    throw new AdminBookingMutationError('Booking changed while it was being updated; please retry', 409)
  }
}

function activeStatus(status: BookingStatus): boolean {
  return status === 'pending' || status === 'confirmed'
}

export async function createAdminBooking(
  input: unknown,
  idempotency: IdempotencyInput
): Promise<IdempotentResult<CreatedAdminBooking>> {
  const body = asObject(input)
  const serviceType = normaliseServiceType(body.service_type)
  const hireType = normaliseHireType(body.hire_type, serviceType)
  const status = normaliseQuickAddStatus(body.status)
  const vehicleId = optionalId(body.vehicle_id, 'vehicle_id')
  const vendorId = optionalId(body.vendor_id, 'vendor_id')
  const contactName = optionalText(body.contact_name, 'contact_name', MAX_VARCHAR_LENGTH)
  const contactEmail = requiredContact(body.contact_email, 'contact_email')
  const contactPhone = requiredContact(body.contact_phone, 'contact_phone')
  const tripDetails = optionalText(body.notes ?? body.trip_details, 'notes', MAX_TEXT_LENGTH)
  const overrideCents = centsFromOverride(body.daily_rate_override)

  if (serviceType !== 'vehicle' && vehicleId) {
    throw new AdminBookingMutationError('vehicle_id is only valid for vehicle bookings', 400)
  }

  return withTransaction(transaction =>
    runIdempotently(transaction, idempotency, async () => {
      let dateRange = validateBookingDateRange(body.start_date, body.end_date)
      let dailyRate = 0
      let resolvedVehicleId: string | null = null
      let currency = 'AUD'

      if (serviceType === 'vehicle' && vehicleId) {
        const locked = await lockAndValidateBookingVehicle(transaction, {
          channel: 'admin',
          vehicleId,
          hireType,
          startDate: body.start_date,
          endDate: body.end_date,
          isEnquiry: false,
          checkConflicts: activeStatus(status),
        })
        dateRange = locked.dateRange
        resolvedVehicleId = locked.vehicle.id
        currency = locked.vehicle.currency
        dailyRate = getDailyRate(
          {
            price: locked.vehicle.price,
            chauffeur_price: locked.vehicle.chauffeur_price,
            day_rates: parseDayRates(locked.vehicle.day_rates),
          },
          hireType,
          dateRange.totalDays
        )
        assertMoneyFits(dailyRate, 'daily rate')
      }

      if (vendorId) {
        const vendor = await transaction.queryOne<{ id: string; billing_currency: string }>(
          'SELECT id, billing_currency FROM Vendor WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE',
          [vendorId]
        )
        if (!vendor) throw new AdminBookingMutationError('Active vendor not found', 404)
        if (!resolvedVehicleId) currency = normaliseBookingCurrency(vendor.billing_currency)
      }

      if (overrideCents !== null) dailyRate = overrideCents
      const totalCost = dailyRate * dateRange.totalDays
      assertMoneyFits(totalCost, 'total cost')

      const id = newId()
      const publicId = await generatePublicId('VHB', transaction)
      await transaction.execute(
        `INSERT INTO Booking (
           id, public_id, vehicle_id, hire_type, service_type, status,
           start_date, end_date, total_days, daily_rate, total_cost, currency,
           contact_name, contact_email, contact_phone, trip_details,
           is_enquiry, vendor_id, completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?,
                   CASE WHEN ? = 'completed' THEN NOW() ELSE NULL END, NOW(), NOW())`,
        [
          id, publicId, resolvedVehicleId, hireType, serviceType, status,
          dateRange.startDate, dateRange.endDate, dateRange.totalDays,
          dailyRate, totalCost, currency, contactName, contactEmail, contactPhone,
          tripDetails, vendorId, status,
        ]
      )

      return {
        value: {
          id,
          public_id: publicId,
          sideEffects: {
            bookingId: id,
            calendar: resolvedVehicleId ? 'sync' : 'none',
            sendConfirmation: status === 'confirmed',
          },
        },
        statusCode: 200,
        resourceId: id,
      }
    })
  )
}

export async function updateAdminBookingStatus(
  bookingIdValue: unknown,
  statusValue: unknown
): Promise<UpdatedAdminBooking> {
  const bookingId = requiredId(bookingIdValue, 'booking id')
  const status = normaliseStatus(statusValue)
  const snapshot = await queryOne<BookingAvailabilitySnapshot>(
    `SELECT id, vehicle_id, hire_type, start_date, end_date
     FROM Booking WHERE id = ? LIMIT 1`,
    [bookingId]
  )
  if (!snapshot) throw new AdminBookingMutationError('Booking not found', 404)

  return withTransaction(async (transaction) => {
    if (activeStatus(status) && snapshot.vehicle_id) {
      const hireType = normaliseHireType(snapshot.hire_type, 'vehicle')
      await lockAndValidateBookingVehicle(transaction, {
        channel: 'admin',
        vehicleId: snapshot.vehicle_id,
        hireType,
        startDate: snapshot.start_date,
        endDate: snapshot.end_date,
        isEnquiry: false,
        excludeBookingId: bookingId,
      })
    }

    const booking = await transaction.queryOne<BookingMutationRow>(
      'SELECT * FROM Booking WHERE id = ? LIMIT 1 FOR UPDATE',
      [bookingId]
    )
    if (!booking) throw new AdminBookingMutationError('Booking not found', 404)
    assertSnapshotUnchanged(booking, snapshot)

    if (booking.is_enquiry) {
      throw new AdminBookingMutationError('Use the enquiry actions before changing booking status', 409)
    }
    if (activeStatus(status)) validateStoredContact(booking)

    const changed = booking.status !== status
    let resultBooking = booking
    if (changed) {
      await transaction.execute(
        `UPDATE Booking
         SET status = ?,
             completed_at = CASE
               WHEN ? = 'completed' THEN COALESCE(completed_at, NOW())
               ELSE NULL
             END,
             updated_at = NOW()
         WHERE id = ?`,
        [status, status, bookingId]
      )
      const refreshed = await transaction.queryOne<BookingMutationRow>(
        'SELECT * FROM Booking WHERE id = ? LIMIT 1',
        [bookingId]
      )
      if (!refreshed) throw new Error('Updated booking could not be loaded')
      resultBooking = refreshed
    }

    return {
      booking: resultBooking,
      sideEffects: {
        bookingId,
        calendar: changed ? (status === 'cancelled' ? 'delete' : 'sync') : 'none',
        sendConfirmation: changed && status === 'confirmed',
      },
    }
  })
}

export async function updateAdminEnquiry(
  bookingIdValue: unknown,
  actionValue: unknown
): Promise<{ enquiry_status?: 'contacted' | 'lost'; converted?: true; sideEffects: BookingMutationSideEffects }> {
  const bookingId = requiredId(bookingIdValue, 'booking id')
  const action = normaliseEnquiryAction(actionValue)
  const snapshot = action === 'converted'
    ? await queryOne<BookingAvailabilitySnapshot>(
        `SELECT id, vehicle_id, hire_type, start_date, end_date
         FROM Booking WHERE id = ? LIMIT 1`,
        [bookingId]
      )
    : null

  if (action === 'converted' && !snapshot) {
    throw new AdminBookingMutationError('Enquiry not found', 404)
  }

  return withTransaction(async (transaction) => {
    if (action === 'converted' && snapshot?.vehicle_id) {
      const hireType = normaliseHireType(snapshot.hire_type, 'vehicle')
      await lockAndValidateBookingVehicle(transaction, {
        channel: 'admin',
        vehicleId: snapshot.vehicle_id,
        hireType,
        startDate: snapshot.start_date,
        endDate: snapshot.end_date,
        isEnquiry: false,
        excludeBookingId: bookingId,
      })
    }

    const booking = await transaction.queryOne<BookingMutationRow>(
      'SELECT * FROM Booking WHERE id = ? LIMIT 1 FOR UPDATE',
      [bookingId]
    )
    if (!booking || !booking.is_enquiry) {
      throw new AdminBookingMutationError('Enquiry not found', 404)
    }

    if (action === 'converted') {
      if (!snapshot) throw new AdminBookingMutationError('Enquiry not found', 404)
      assertSnapshotUnchanged(booking, snapshot)
      validateBookingDateRange(booking.start_date, booking.end_date)
      validateStoredContact(booking)
      await transaction.execute(
        `UPDATE Booking
         SET is_enquiry = 0, status = 'pending', enquiry_status = 'converted',
             completed_at = NULL, updated_at = NOW()
         WHERE id = ?`,
        [bookingId]
      )
      return {
        converted: true as const,
        sideEffects: {
          bookingId,
          calendar: booking.vehicle_id ? 'sync' as const : 'none' as const,
          sendConfirmation: false,
        },
      }
    }

    await transaction.execute(
      'UPDATE Booking SET enquiry_status = ?, updated_at = NOW() WHERE id = ?',
      [action, bookingId]
    )
    return {
      enquiry_status: action,
      sideEffects: { bookingId, calendar: 'none' as const, sendConfirmation: false },
    }
  })
}

export async function prepareAdminEnquiryNotification(
  bookingIdValue: unknown
): Promise<AdminEnquiryNotificationBooking> {
  const bookingId = requiredId(bookingIdValue, 'booking id')
  return withTransaction(async (transaction) => {
    const booking = await transaction.queryOne<AdminEnquiryNotificationBooking>(
      `SELECT b.*, v.name AS vehicle_name
       FROM Booking b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bookingId]
    )
    if (!booking || !booking.is_enquiry) {
      throw new AdminBookingMutationError('Enquiry not found', 404)
    }
    validateStoredContact(booking)
    return booking
  })
}

export async function markAdminEnquiryNotified(bookingIdValue: unknown): Promise<void> {
  const bookingId = requiredId(bookingIdValue, 'booking id')
  await withTransaction(async (transaction) => {
    await transaction.execute(
      `UPDATE Booking
       SET enquiry_status = 'contacted', updated_at = NOW()
       WHERE id = ? AND is_enquiry = 1 AND enquiry_status = 'new'`,
      [bookingId]
    )
  })
}

export async function createAdminBlockout(
  input: unknown,
  forcedVehicleId?: unknown
): Promise<AdminBlockout> {
  const body = asObject(input)
  const dateRange = validateBookingDateRange(body.start_date, body.end_date)
  const reason = optionalText(body.reason, 'reason', MAX_VARCHAR_LENGTH) ?? ''
  const vehicleId = forcedVehicleId === undefined
    ? optionalId(body.vehicle_id, 'vehicle_id')
    : requiredId(forcedVehicleId, 'vehicle id')

  return withTransaction(async (transaction) => {
    if (vehicleId) {
      const vehicle = await transaction.queryOne<{ id: string }>(
        'SELECT id FROM Vehicle WHERE id = ? LIMIT 1 FOR UPDATE',
        [vehicleId]
      )
      if (!vehicle) throw new AdminBookingMutationError('Vehicle not found', 404)
    } else {
      // A fleet-wide blockout shares the same vehicle-row mutex used by
      // booking creation. Ordering keeps concurrent global blockouts stable.
      await transaction.query<{ id: string }>('SELECT id FROM Vehicle ORDER BY id FOR UPDATE')
    }

    const conflict = vehicleId
      ? await transaction.queryOne<{ public_id: string }>(
          `SELECT public_id FROM Booking
           WHERE vehicle_id = ?
             AND status IN ('pending', 'confirmed')
             AND start_date <= ? AND end_date >= ?
           LIMIT 1 FOR UPDATE`,
          [vehicleId, dateRange.endDate, dateRange.startDate]
        )
      : await transaction.queryOne<{ public_id: string }>(
          `SELECT public_id FROM Booking
           WHERE vehicle_id IS NOT NULL
             AND status IN ('pending', 'confirmed')
             AND start_date <= ? AND end_date >= ?
           LIMIT 1 FOR UPDATE`,
          [dateRange.endDate, dateRange.startDate]
        )

    if (conflict) {
      throw new BookingValidationError(
        'BOOKING_CONFLICT',
        `Blockout overlaps active booking ${conflict.public_id}`,
        409
      )
    }

    const id = newId()
    await transaction.execute(
      `INSERT INTO VehicleBlockout
         (id, vehicle_id, start_date, end_date, reason, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, vehicleId, dateRange.startDate, dateRange.endDate, reason]
    )
    const blockout = await transaction.queryOne<AdminBlockout>(
      `SELECT b.*, v.name AS vehicle_name
       FROM VehicleBlockout b
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       WHERE b.id = ? LIMIT 1`,
      [id]
    )
    if (!blockout) throw new Error('Created blockout could not be loaded')
    return blockout
  })
}

export async function runBookingMutationSideEffects(
  effects: BookingMutationSideEffects
): Promise<void> {
  const tasks: Promise<unknown>[] = []
  if (effects.calendar === 'sync') tasks.push(syncBookingToCalendar(effects.bookingId))
  if (effects.calendar === 'delete') tasks.push(deleteCalendarEvent(effects.bookingId))
  if (effects.sendConfirmation) tasks.push(sendBookingConfirmed(effects.bookingId))

  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[admin-booking] post-commit side effect failed', result.reason)
    }
  }
}
