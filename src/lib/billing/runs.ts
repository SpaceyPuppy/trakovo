import { newId, query, queryOne, withTransaction } from '@/lib/db'
import {
  addBillingEvent,
  allocateInvoicePublicIds,
  assertPositiveMoney,
  createInvoice,
  databaseToday,
  loadIssuerSnapshot,
  normaliseCurrency,
  optionalIsoDate,
  readMoney,
  type BillableBooking,
  type CreatedInvoice,
  type RecipientSnapshot,
} from './core'
import { BillingError } from './errors'
import { runIdempotently, type IdempotencyInput, type IdempotentResult } from './idempotency'

interface VendorBookingRow extends BillableBooking {
  vendor_name: string
  vendor_contact_email: string
  vendor_contact_phone: string
  billing_name: string
  billing_email: string
  billing_address: string | null
  billing_abn: string
  billing_currency: string
  billing_terms_days: number | string
  billing_enabled: number | boolean
}

interface ReviewedBookingSnapshot {
  id: string
  vendor_id: string
  total_amount: number
  currency: string
}

export interface ReadyBooking {
  id: string
  public_id: string
  contact_name: string | null
  vehicle_name: string | null
  start_date: string
  end_date: string
  total_amount: number
  currency: string
}

export interface ReadyVendorGroup {
  vendor: {
    id: string
    name: string
    billing_name: string
    billing_email: string
    billing_terms_days: number
  }
  booking_count: number
  total_amount: number
  currency: string
  bookings: ReadyBooking[]
}

export interface BillingReadiness {
  cutoff_date: string
  vendor_count: number
  booking_count: number
  total_amount: number
  vendors: ReadyVendorGroup[]
  needs_attention: Array<ReadyBooking & {
    vendor_id: string
    vendor_name: string
    reason: 'needs_price' | 'billing_disabled' | 'currency_mismatch'
  }>
}

export interface BillingRunResult {
  run: {
    id: string
    cutoff_date: string
    status: 'completed' | 'empty'
    invoice_count: number
    booking_count: number
    total_amount: number
    currency: string
  }
  invoices: CreatedInvoice[]
}

function validateVendorIds(value: unknown, rejectExplicitEmpty = false): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id.trim())) {
    throw new BillingError('vendor_ids must be an array of vendor IDs', 400)
  }
  const ids = Array.from(new Set(value.map(id => (id as string).trim())))
  if (rejectExplicitEmpty && ids.length === 0) {
    throw new BillingError('vendor_ids cannot be empty when provided', 400)
  }
  if (ids.length > 200) throw new BillingError('A bill run can include at most 200 vendors', 400)
  return ids
}

function validateReviewedBookings(value: unknown): ReviewedBookingSnapshot[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BillingError(
      'reviewed_bookings must contain the bookings shown in the billing review',
      400,
      'billing_review_required'
    )
  }
  if (value.length > 1000) {
    throw new BillingError('A bill run can include at most 1000 reviewed bookings', 400)
  }
  const snapshots = value.map((item): ReviewedBookingSnapshot => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BillingError('Invalid reviewed booking snapshot', 400)
    }
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id.trim() || row.id.length > 191 ||
        typeof row.vendor_id !== 'string' || !row.vendor_id.trim() || row.vendor_id.length > 191) {
      throw new BillingError('Invalid reviewed booking identity', 400)
    }
    if (typeof row.currency !== 'string' || !/^[A-Za-z]{3}$/.test(row.currency.trim())) {
      throw new BillingError('Invalid reviewed booking currency', 400)
    }
    return {
      id: row.id.trim(),
      vendor_id: row.vendor_id.trim(),
      total_amount: assertPositiveMoney(row.total_amount, 'reviewed total_amount'),
      currency: normaliseCurrency(row.currency),
    }
  })
  if (new Set(snapshots.map(snapshot => snapshot.id)).size !== snapshots.length) {
    throw new BillingError('reviewed_bookings contains a duplicate booking', 400)
  }
  return snapshots
}

function vendorFilter(vendorIds: string[]): { sql: string; values: string[] } {
  if (vendorIds.length === 0) return { sql: '', values: [] }
  return {
    sql: ` AND b.vendor_id IN (${vendorIds.map(() => '?').join(', ')})`,
    values: vendorIds,
  }
}

function recipient(row: VendorBookingRow): RecipientSnapshot {
  const terms = Number(row.billing_terms_days)
  return {
    name: row.billing_name.trim() || row.vendor_name,
    abn: row.billing_abn || '',
    email: row.billing_email.trim() || row.vendor_contact_email,
    phone: row.vendor_contact_phone,
    address: row.billing_address || null,
    paymentTermsDays: Number.isInteger(terms) ? Math.max(0, Math.min(365, terms)) : 14,
  }
}

function toReadyBooking(row: VendorBookingRow): ReadyBooking {
  return {
    id: row.id,
    public_id: row.public_id,
    contact_name: row.contact_name,
    vehicle_name: row.vehicle_name,
    start_date: row.start_date,
    end_date: row.end_date,
    total_amount: readMoney(row.total_cost),
    currency: normaliseCurrency(row.currency),
  }
}

function groupRows(rows: VendorBookingRow[]): ReadyVendorGroup[] {
  const grouped = new Map<string, ReadyVendorGroup>()
  for (const row of rows) {
    const amount = readMoney(row.total_cost)
    const existing = grouped.get(row.vendor_id!)
    if (existing) {
      existing.bookings.push(toReadyBooking(row))
      existing.booking_count += 1
      existing.total_amount += amount
      continue
    }
    grouped.set(row.vendor_id!, {
      vendor: {
        id: row.vendor_id!,
        name: row.vendor_name,
        billing_name: row.billing_name.trim() || row.vendor_name,
        billing_email: row.billing_email.trim() || row.vendor_contact_email,
        billing_terms_days: recipient(row).paymentTermsDays,
      },
      booking_count: 1,
      total_amount: amount,
      currency: normaliseCurrency(row.currency),
      bookings: [toReadyBooking(row)],
    })
  }
  return Array.from(grouped.values())
}

async function resolveCutoff(value: unknown): Promise<string> {
  if (value !== undefined && value !== null && value !== '') {
    return optionalIsoDate(value, 'cutoff')!
  }
  const row = await queryOne<{ today: string }>("SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS today")
  if (!row?.today) throw new BillingError('Could not resolve the billing cutoff date', 500)
  return row.today
}

const VENDOR_BOOKING_SELECT = `
  SELECT b.id, b.public_id, b.vendor_id, b.contact_name, b.contact_email,
         b.contact_phone, b.start_date, b.end_date, b.total_cost, b.currency,
         b.service_type, b.hire_type, vehicle.name AS vehicle_name,
         v.name AS vendor_name, v.contact_email AS vendor_contact_email,
         v.contact_phone AS vendor_contact_phone, v.billing_name,
         v.billing_email, v.billing_address, v.billing_abn,
         v.billing_currency, v.billing_terms_days, v.billing_enabled
  FROM Booking b
  JOIN Vendor v ON v.id = b.vendor_id
  LEFT JOIN Vehicle vehicle ON vehicle.id = b.vehicle_id`

export async function getBillingReadiness(input: {
  cutoff?: unknown
  vendorIds?: unknown
}): Promise<BillingReadiness> {
  const cutoff = await resolveCutoff(input.cutoff)
  const vendorIds = validateVendorIds(input.vendorIds)
  const filter = vendorFilter(vendorIds)
  const rows = await query<VendorBookingRow>(
    `${VENDOR_BOOKING_SELECT}
     WHERE b.status = 'completed'
       AND b.is_enquiry = 0
       AND b.end_date <= ?
       AND NOT EXISTS (
         SELECT 1 FROM InvoiceLine line_claim
         WHERE line_claim.booking_claim = b.id
       )
       ${filter.sql}
     ORDER BY v.name, b.end_date, b.public_id`,
    [cutoff, ...filter.values]
  )

  const readyRows: VendorBookingRow[] = []
  const needsAttention: BillingReadiness['needs_attention'] = []
  for (const row of rows) {
    const amount = readMoney(row.total_cost)
    const currency = normaliseCurrency(row.currency)
    let reason: BillingReadiness['needs_attention'][number]['reason'] | null = null
    if (!Boolean(row.billing_enabled)) reason = 'billing_disabled'
    else if (amount <= 0) reason = 'needs_price'
    else if (currency !== normaliseCurrency(row.billing_currency)) reason = 'currency_mismatch'

    if (reason) {
      needsAttention.push({
        ...toReadyBooking(row),
        vendor_id: row.vendor_id!,
        vendor_name: row.vendor_name,
        reason,
      })
    } else {
      readyRows.push(row)
    }
  }

  const vendors = groupRows(readyRows)
  return {
    cutoff_date: cutoff,
    vendor_count: vendors.length,
    booking_count: readyRows.length,
    total_amount: vendors.reduce((total, group) => total + group.total_amount, 0),
    vendors,
    needs_attention: needsAttention,
  }
}

export async function createBillingRun(input: {
  actor: string
  cutoffDate: unknown
  vendorIds?: unknown
  reviewedBookings?: unknown
  dueDate?: unknown
  notes?: unknown
  idempotency: IdempotencyInput
}): Promise<IdempotentResult<BillingRunResult>> {
  const cutoff = optionalIsoDate(input.cutoffDate, 'cutoff_date')
  if (!cutoff) throw new BillingError('cutoff_date is required', 400)
  let vendorIds = validateVendorIds(
    input.vendorIds,
    input.vendorIds !== undefined && input.vendorIds !== null
  )
  const reviewedBookings = validateReviewedBookings(input.reviewedBookings)
  const reviewedVendorIds = Array.from(new Set(reviewedBookings.map(booking => booking.vendor_id)))
  if (vendorIds.length === 0) vendorIds = reviewedVendorIds
  const selectedVendors = new Set(vendorIds)
  if (reviewedVendorIds.length !== vendorIds.length ||
      reviewedVendorIds.some(vendorId => !selectedVendors.has(vendorId))) {
    throw new BillingError(
      'vendor_ids must exactly match the reviewed bookings',
      400,
      'billing_review_vendor_mismatch'
    )
  }
  const dueDate = optionalIsoDate(input.dueDate, 'due_date')
  const notes = input.notes === undefined || input.notes === null
    ? null
    : typeof input.notes === 'string' && input.notes.trim().length <= 5000
      ? input.notes.trim()
      : (() => { throw new BillingError('notes must be 5000 characters or fewer', 400) })()

  return withTransaction(transaction =>
    runIdempotently(transaction, input.idempotency, async () => {
      if (dueDate) {
        const today = await databaseToday(transaction)
        if (dueDate < today) {
          throw new BillingError(
            'due_date cannot be before today for a new bill run',
            400,
            'invalid_due_date'
          )
        }
      }
      const reviewedPlaceholders = reviewedBookings.map(() => '?').join(', ')
      const rows = await transaction.query<VendorBookingRow>(
        `${VENDOR_BOOKING_SELECT}
         WHERE b.id IN (${reviewedPlaceholders})
           AND b.status = 'completed'
           AND b.is_enquiry = 0
           AND b.total_cost > 0
           AND b.end_date <= ?
           AND v.billing_enabled = 1
           AND b.currency = v.billing_currency
           AND NOT EXISTS (
             SELECT 1 FROM InvoiceLine line_claim
             WHERE line_claim.booking_claim = b.id
           )
         ORDER BY b.vendor_id, b.end_date, b.public_id
         FOR UPDATE`,
        [...reviewedBookings.map(booking => booking.id), cutoff]
      )
      if (rows.length !== reviewedBookings.length) {
        throw new BillingError(
          'Billing data changed after review. Refresh the review before creating invoices.',
          409,
          'billing_review_stale'
        )
      }
      const lockedById = new Map(rows.map(row => [row.id, row]))
      const reviewChanged = reviewedBookings.some(snapshot => {
        const row = lockedById.get(snapshot.id)
        return !row || row.vendor_id !== snapshot.vendor_id ||
          readMoney(row.total_cost) !== snapshot.total_amount ||
          normaliseCurrency(row.currency) !== snapshot.currency
      })
      if (reviewChanged) {
        throw new BillingError(
          'Billing data changed after review. Refresh the review before creating invoices.',
          409,
          'billing_review_stale'
        )
      }
      const runCurrencies = new Set(rows.map(row => normaliseCurrency(row.currency)))
      if (runCurrencies.size > 1) {
        throw new BillingError(
          'A bill run cannot combine more than one currency',
          409,
          'mixed_billing_run_currencies'
        )
      }

      const runId = newId()
      await transaction.execute(
        `INSERT INTO BillingRun
           (id, idempotency_key, cutoff_date, status, vendor_filter, notes,
            created_by, created_at)
         VALUES (?, ?, ?, 'processing', ?, ?, ?, NOW())`,
        [
          runId,
          input.idempotency.key,
          cutoff,
          vendorIds.length ? JSON.stringify(vendorIds) : null,
          notes,
          input.actor,
        ]
      )

      const byVendor = new Map<string, VendorBookingRow[]>()
      for (const row of rows) {
        const vendorRows = byVendor.get(row.vendor_id!) ?? []
        vendorRows.push(row)
        byVendor.set(row.vendor_id!, vendorRows)
      }

      const vendorEntries = Array.from(byVendor.entries())
      const publicIds = await allocateInvoicePublicIds(transaction, vendorEntries.length)
      const issuerSnapshot = vendorEntries.length
        ? await loadIssuerSnapshot(transaction)
        : undefined
      const invoices: CreatedInvoice[] = []
      for (let index = 0; index < vendorEntries.length; index += 1) {
        const [vendorId, bookings] = vendorEntries[index]
        invoices.push(await createInvoice(transaction, {
          actor: input.actor,
          invoiceType: 'vendor',
          vendorId,
          billingRunId: runId,
          recipient: recipient(bookings[0]),
          bookings,
          dueDate,
          // Bill-run notes are internal operational context. Invoice notes are
          // customer-visible on the printable invoice and must not inherit them.
          notes: null,
          issuerSnapshot,
          publicId: publicIds[index],
        }))
      }

      const totalAmount = invoices.reduce((total, invoice) => total + invoice.total_amount, 0)
      const status = invoices.length ? 'completed' : 'empty'
      await transaction.execute(
        `UPDATE BillingRun
         SET status = ?, invoice_count = ?, booking_count = ?, total_amount = ?, currency = ?,
             completed_at = NOW()
         WHERE id = ?`,
        [
          status,
          invoices.length,
          rows.length,
          totalAmount,
          Array.from(runCurrencies)[0] ?? 'AUD',
          runId,
        ]
      )
      await addBillingEvent(transaction, {
        eventType: 'billing_run_completed',
        actor: input.actor,
        billingRunId: runId,
        details: {
          cutoff_date: cutoff,
          invoice_count: invoices.length,
          booking_count: rows.length,
          total_amount: totalAmount,
        },
      })

      const result: BillingRunResult = {
        run: {
          id: runId,
          cutoff_date: cutoff,
          status,
          invoice_count: invoices.length,
          booking_count: rows.length,
          total_amount: totalAmount,
          currency: Array.from(runCurrencies)[0] ?? 'AUD',
        },
        invoices,
      }
      return { value: result, statusCode: 201, resourceId: runId }
    })
  )
}
