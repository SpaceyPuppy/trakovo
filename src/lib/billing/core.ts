import type { DbTransaction } from '@/lib/db'
import { generatePublicId, newId } from '@/lib/db'
import { BillingError } from './errors'

export const INVOICE_STATUSES = ['draft', 'issued', 'part_paid', 'paid', 'void'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export interface BillableBooking {
  id: string
  public_id: string
  vendor_id: string | null
  contact_name: string | null
  contact_email: string
  contact_phone: string
  start_date: string
  end_date: string
  total_cost: number | string
  currency: string
  vehicle_name: string | null
  service_type: string | null
  hire_type: string
}

export interface RecipientSnapshot {
  name: string
  abn: string
  email: string
  phone: string
  address: string | null
  paymentTermsDays: number
}

export interface IssuerSnapshot {
  name: string
  abn: string
  email: string
  phone: string
  address: string | null
  taxMode: 'none' | 'inclusive'
  taxRateBps: number
}

export interface CreatedInvoice {
  id: string
  public_id: string
  status: InvoiceStatus
  vendor_id: string | null
  booking_count: number
  total_amount: number
  balance_due: number
  currency: string
}

export function assertIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BillingError(`${field} must use YYYY-MM-DD format`, 400, 'invalid_date')
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BillingError(`${field} is not a valid date`, 400, 'invalid_date')
  }
  return value
}

export function optionalIsoDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  return assertIsoDate(value, field)
}

export function addDaysIso(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function readMoney(value: number | string, field = 'amount'): number {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new BillingError(`${field} is invalid`, 500, 'invalid_stored_amount')
  }
  return amount
}

export function assertPositiveMoney(value: unknown, field: string): number {
  const amount = typeof value === 'number' ? value : Number.NaN
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new BillingError(`${field} must be a positive integer number of cents`, 400, 'invalid_amount')
  }
  return amount
}

export function normaliseCurrency(value: unknown): string {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!/^[A-Z]{3}$/.test(currency)) return 'AUD'
  return currency
}

export async function databaseToday(transaction: DbTransaction): Promise<string> {
  const row = await transaction.queryOne<{ today: string }>(
    "SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS today"
  )
  if (!row?.today) throw new BillingError('Could not resolve the billing date', 500)
  return row.today
}

export async function loadIssuerSnapshot(transaction: DbTransaction): Promise<IssuerSnapshot> {
  const keys = [
    'billing_legal_name',
    'billing_abn',
    'billing_email',
    'billing_phone',
    'billing_address',
    'billing_tax_mode',
    'billing_tax_rate_bps',
    'site_name',
  ]
  const placeholders = keys.map(() => '?').join(', ')
  const rows = await transaction.query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM Setting WHERE \`key\` IN (${placeholders})`,
    keys
  )
  const settings = Object.fromEntries(rows.map(row => [row.key, row.value]))
  const taxMode = settings.billing_tax_mode === 'inclusive' ? 'inclusive' : 'none'
  const configuredRate = Number(settings.billing_tax_rate_bps)
  const taxRateBps = taxMode === 'inclusive'
    ? Number.isInteger(configuredRate) && configuredRate > 0 && configuredRate <= 10000
      ? configuredRate
      : 1000
    : 0
  return {
    name:
      settings.billing_legal_name ||
      settings.site_name ||
      process.env.NEXT_PUBLIC_SITE_NAME ||
      'Trakovo',
    abn: settings.billing_abn || '',
    email: settings.billing_email || '',
    phone: settings.billing_phone || '',
    address: settings.billing_address || null,
    taxMode,
    taxRateBps,
  }
}

/** Allocate a contiguous block with the same connection-scoped LAST_INSERT_ID
 * mechanism used by generatePublicId, but with two queries for the whole run. */
export async function allocateInvoicePublicIds(
  transaction: DbTransaction,
  count: number
): Promise<string[]> {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new BillingError('Invalid invoice ID allocation size', 500)
  }
  if (count === 0) return []
  await transaction.execute(
    `INSERT INTO PublicIdSequence (prefix, last_value, updated_at)
     VALUES ('INV', LAST_INSERT_ID(?), NOW())
     ON DUPLICATE KEY UPDATE
       last_value = LAST_INSERT_ID(last_value + ?),
       updated_at = NOW()`,
    [count, count]
  )
  const allocated = await transaction.queryOne<{ value: number | string }>(
    'SELECT LAST_INSERT_ID() AS value'
  )
  const lastValue = Number(allocated?.value)
  const firstValue = lastValue - count + 1
  if (!Number.isSafeInteger(lastValue) || firstValue < 1) {
    throw new BillingError('Failed to allocate invoice references', 500)
  }
  return Array.from({ length: count }, (_, index) =>
    `INV-${String(firstValue + index).padStart(4, '0')}`
  )
}

export async function addBillingEvent(
  transaction: DbTransaction,
  input: {
    eventType: string
    actor: string
    invoiceId?: string | null
    billingRunId?: string | null
    paymentId?: string | null
    details?: Record<string, unknown>
  }
): Promise<void> {
  await transaction.execute(
    `INSERT INTO BillingEvent
       (id, invoice_id, billing_run_id, payment_id, event_type, actor, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      newId(),
      input.invoiceId ?? null,
      input.billingRunId ?? null,
      input.paymentId ?? null,
      input.eventType,
      input.actor,
      input.details ? JSON.stringify(input.details) : null,
    ]
  )
}

function lineDescription(booking: BillableBooking): string {
  const service = booking.vehicle_name || (booking.service_type === 'taxi' ? 'Taxi service' : 'Vehicle hire')
  return `${service} - booking ${booking.public_id} - ${booking.start_date} to ${booking.end_date}`
}

export async function createInvoice(
  transaction: DbTransaction,
  input: {
    actor: string
    invoiceType: 'direct' | 'vendor'
    recipient: RecipientSnapshot
    bookings: BillableBooking[]
    vendorId?: string | null
    billingRunId?: string | null
    dueDate?: string | null
    notes?: string | null
    issuerSnapshot?: IssuerSnapshot
    publicId?: string
  }
): Promise<CreatedInvoice> {
  if (input.bookings.length === 0) {
    throw new BillingError('An invoice requires at least one booking', 400)
  }

  const currencies = new Set(input.bookings.map(booking => normaliseCurrency(booking.currency)))
  if (currencies.size !== 1) {
    throw new BillingError(
      'Bookings with different currencies cannot share an invoice',
      409,
      'mixed_invoice_currencies'
    )
  }
  const currency = Array.from(currencies)[0]
  const amounts = input.bookings.map(booking => readMoney(booking.total_cost, 'booking total'))
  if (amounts.some(amount => amount <= 0)) {
    throw new BillingError(
      'Every invoiced booking must have a positive total',
      409,
      'booking_needs_price'
    )
  }
  const total = amounts.reduce((sum, amount) => sum + amount, 0)
  if (!Number.isSafeInteger(total)) {
    throw new BillingError('Invoice total is too large', 409, 'invoice_total_too_large')
  }

  const issuer = input.issuerSnapshot ?? await loadIssuerSnapshot(transaction)
  const lineTaxes = amounts.map(amount =>
    issuer.taxMode === 'inclusive'
      ? Math.round(amount * (issuer.taxRateBps / (10000 + issuer.taxRateBps)))
      : 0
  )
  const lineSubtotals = amounts.map((amount, index) => amount - lineTaxes[index])
  const taxTotal = lineTaxes.reduce((sum, amount) => sum + amount, 0)
  const subtotal = lineSubtotals.reduce((sum, amount) => sum + amount, 0)
  const invoiceId = newId()
  const publicId = input.publicId ?? await generatePublicId('INV', transaction)
  const directBookingId = input.invoiceType === 'direct' ? input.bookings[0].id : null

  await transaction.execute(
    `INSERT INTO Invoice
       (id, public_id, billing_run_id, booking_id, vendor_id, invoice_type,
        status, currency,
        issuer_name, issuer_abn, issuer_email, issuer_phone, issuer_address,
        recipient_name, recipient_abn, recipient_email, recipient_phone, recipient_address,
        due_date, payment_terms_days, tax_mode, tax_rate_bps,
        subtotal_amount, tax_amount, total_amount, amount_paid, balance_due,
        notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
    [
      invoiceId,
      publicId,
      input.billingRunId ?? null,
      directBookingId,
      input.vendorId ?? null,
      input.invoiceType,
      currency,
      issuer.name,
      issuer.abn,
      issuer.email,
      issuer.phone,
      issuer.address,
      input.recipient.name,
      input.recipient.abn,
      input.recipient.email,
      input.recipient.phone,
      input.recipient.address,
      input.dueDate ?? null,
      input.recipient.paymentTermsDays,
      issuer.taxMode,
      issuer.taxRateBps,
      subtotal,
      taxTotal,
      total,
      total,
      input.notes ?? null,
      input.actor,
    ]
  )

  const valueSql = input.bookings
    .map(() => '(?, ?, ?, ?, ?, ?, ?, 1.00, ?, ?, ?, ?, ?, ?, NOW())')
    .join(', ')
  const lineValues = input.bookings.flatMap((booking, index) => {
    const amount = amounts[index]
    return [
      newId(),
      invoiceId,
      booking.id,
      booking.id,
      lineDescription(booking),
      booking.start_date,
      booking.end_date,
      amount,
      lineSubtotals[index],
      issuer.taxRateBps,
      lineTaxes[index],
      amount,
      index,
    ]
  })
  await transaction.execute(
    `INSERT INTO InvoiceLine
       (id, invoice_id, booking_id, booking_claim, description, service_start,
        service_end, quantity, unit_amount, subtotal_amount, tax_rate_bps,
        tax_amount, total_amount, sort_order, created_at)
     VALUES ${valueSql}`,
    lineValues
  )

  await addBillingEvent(transaction, {
    eventType: 'invoice_created',
    actor: input.actor,
    invoiceId,
    billingRunId: input.billingRunId,
    details: {
      invoice_type: input.invoiceType,
      booking_ids: input.bookings.map(booking => booking.id),
      total_amount: total,
      subtotal_amount: subtotal,
      tax_amount: taxTotal,
      tax_mode: issuer.taxMode,
      tax_rate_bps: issuer.taxRateBps,
      currency,
    },
  })

  return {
    id: invoiceId,
    public_id: publicId,
    status: 'draft',
    vendor_id: input.vendorId ?? null,
    booking_count: input.bookings.length,
    total_amount: total,
    balance_due: total,
    currency,
  }
}
