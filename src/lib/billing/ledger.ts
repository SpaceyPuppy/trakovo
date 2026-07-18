import { withTransaction, newId, type DbTransaction } from '@/lib/db'
import {
  addBillingEvent,
  addDaysIso,
  assertPositiveMoney,
  createInvoice,
  databaseToday,
  normaliseCurrency,
  optionalIsoDate,
  readMoney,
  type BillableBooking,
  type CreatedInvoice,
  type InvoiceStatus,
} from './core'
import { BillingError } from './errors'
import { runIdempotently, type IdempotencyInput, type IdempotentResult } from './idempotency'

interface LockedInvoice {
  id: string
  public_id: string
  vendor_id: string | null
  status: InvoiceStatus
  currency: string
  total_amount: number | string
  amount_paid: number | string
  balance_due: number | string
  due_date: string | null
  payment_terms_days: number | string
}

interface DirectBookingRow extends BillableBooking {
  status: string
  is_enquiry: number | boolean
}

export interface PaymentResult {
  payment: {
    id: string
    amount: number
    currency: string
    payment_date: string
    method: string
    reference: string
  }
  invoice: {
    id: string
    public_id: string
    status: InvoiceStatus
    total_amount: number
    amount_paid: number
    balance_due: number
    paid_at: string | null
  }
}

function cleanText(value: unknown, maximum: number, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') throw new BillingError('Invalid text value', 400)
  const text = value.trim()
  if (text.length > maximum) throw new BillingError(`Value must be ${maximum} characters or fewer`, 400)
  return text
}

async function lockInvoice(transaction: DbTransaction, invoiceId: string): Promise<LockedInvoice> {
  const invoice = await transaction.queryOne<LockedInvoice>(
    `SELECT id, public_id, vendor_id, status, currency, total_amount,
            amount_paid, balance_due,
            DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
            payment_terms_days
     FROM Invoice WHERE id = ? FOR UPDATE`,
    [invoiceId]
  )
  if (!invoice) throw new BillingError('Invoice not found', 404, 'invoice_not_found')
  return invoice
}

async function issueLockedInvoice(
  transaction: DbTransaction,
  invoice: LockedInvoice,
  actor: string,
  requestedIssueDate?: string | null,
  requestedDueDate?: string | null
): Promise<{ issueDate: string; dueDate: string }> {
  if (invoice.status !== 'draft') {
    if (['issued', 'part_paid', 'paid'].includes(invoice.status)) {
      const today = await databaseToday(transaction)
      return {
        issueDate: requestedIssueDate ?? today,
        dueDate: invoice.due_date ?? requestedDueDate ?? today,
      }
    }
    throw new BillingError('A void invoice cannot be issued', 409, 'invalid_invoice_transition')
  }
  if (readMoney(invoice.total_amount) <= 0) {
    throw new BillingError('An invoice with a zero total cannot be issued', 409, 'zero_invoice_total')
  }

  const today = await databaseToday(transaction)
  const issueDate = optionalIsoDate(requestedIssueDate, 'issue_date') ?? today
  const terms = Math.max(0, Math.min(365, Number(invoice.payment_terms_days) || 0))
  const dueDate =
    optionalIsoDate(requestedDueDate, 'due_date') ??
    invoice.due_date ??
    addDaysIso(issueDate, terms)
  if (dueDate < issueDate) {
    throw new BillingError('due_date cannot be before issue_date', 400, 'invalid_due_date')
  }

  await transaction.execute(
    `UPDATE Invoice
     SET status = 'issued', issue_date = ?, due_date = ?, issued_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [issueDate, dueDate, invoice.id]
  )
  invoice.status = 'issued'
  invoice.due_date = dueDate
  await addBillingEvent(transaction, {
    eventType: 'invoice_issued',
    actor,
    invoiceId: invoice.id,
    details: { issue_date: issueDate, due_date: dueDate },
  })
  return { issueDate, dueDate }
}

export async function createDirectInvoice(input: {
  actor: string
  bookingId: string
  dueDate?: string | null
  notes?: string | null
  idempotency: IdempotencyInput
}): Promise<IdempotentResult<CreatedInvoice>> {
  if (!input.bookingId) throw new BillingError('booking_id is required', 400)
  const dueDate = optionalIsoDate(input.dueDate, 'due_date')
  const notes = input.notes === undefined || input.notes === null
    ? null
    : cleanText(input.notes, 5000)

  return withTransaction(transaction =>
    runIdempotently(transaction, input.idempotency, async () => {
      if (dueDate) {
        const today = await databaseToday(transaction)
        if (dueDate < today) {
          throw new BillingError(
            'due_date cannot be before today for a new draft invoice',
            400,
            'invalid_due_date'
          )
        }
      }
      const booking = await transaction.queryOne<DirectBookingRow>(
        `SELECT b.id, b.public_id, b.vendor_id, b.status, b.is_enquiry,
                b.contact_name, b.contact_email, b.contact_phone,
                b.start_date, b.end_date, b.total_cost, b.currency,
                b.service_type, b.hire_type, v.name AS vehicle_name
         FROM Booking b
         LEFT JOIN Vehicle v ON v.id = b.vehicle_id
         WHERE b.id = ?
         FOR UPDATE`,
        [input.bookingId]
      )
      if (!booking) throw new BillingError('Booking not found', 404, 'booking_not_found')
      if (booking.vendor_id) {
        throw new BillingError(
          'Vendor bookings must be invoiced through a vendor bill run',
          409,
          'vendor_bill_run_required'
        )
      }
      if (Boolean(booking.is_enquiry) || booking.status === 'cancelled') {
        throw new BillingError('This booking cannot be invoiced', 409, 'booking_not_billable')
      }
      if (readMoney(booking.total_cost) <= 0) {
        throw new BillingError('Set a positive booking price before invoicing', 409, 'booking_needs_price')
      }
      const claimed = await transaction.queryOne<{ invoice_id: string }>(
        'SELECT invoice_id FROM InvoiceLine WHERE booking_claim = ? LIMIT 1',
        [booking.id]
      )
      if (claimed) {
        throw new BillingError(
          'An active invoice already exists for this booking',
          409,
          'booking_already_invoiced'
        )
      }

      const invoice = await createInvoice(transaction, {
        actor: input.actor,
        invoiceType: 'direct',
        recipient: {
          name: booking.contact_name?.trim() || booking.contact_email,
          abn: '',
          email: booking.contact_email,
          phone: booking.contact_phone,
          address: null,
          paymentTermsDays: 14,
        },
        bookings: [booking],
        dueDate,
        notes,
      })
      return { value: invoice, statusCode: 201, resourceId: invoice.id }
    })
  )
}

export async function updateInvoiceDraft(input: {
  actor: string
  invoiceId: string
  dueDate?: string | null
  notes?: string | null
}): Promise<void> {
  await withTransaction(async transaction => {
    const invoice = await lockInvoice(transaction, input.invoiceId)
    if (invoice.status !== 'draft') {
      throw new BillingError('Only draft invoices can be edited', 409, 'invoice_not_editable')
    }
    const dueDate = input.dueDate === undefined
      ? undefined
      : optionalIsoDate(input.dueDate, 'due_date')
    const notes = input.notes === undefined
      ? undefined
      : input.notes === null
        ? null
        : cleanText(input.notes, 5000)
    if (dueDate === undefined && notes === undefined) {
      throw new BillingError('No invoice changes were provided', 400)
    }
    if (dueDate) {
      const today = await databaseToday(transaction)
      if (dueDate < today) {
        throw new BillingError(
          'due_date cannot be before today for a draft invoice',
          400,
          'invalid_due_date'
        )
      }
    }
    const clauses = ['updated_at = NOW()']
    const values: unknown[] = []
    if (dueDate !== undefined) {
      clauses.push('due_date = ?')
      values.push(dueDate)
    }
    if (notes !== undefined) {
      clauses.push('notes = ?')
      values.push(notes)
    }
    values.push(invoice.id)
    await transaction.execute(`UPDATE Invoice SET ${clauses.join(', ')} WHERE id = ?`, values)
    await addBillingEvent(transaction, {
      eventType: 'invoice_updated',
      actor: input.actor,
      invoiceId: invoice.id,
      details: { due_date: dueDate, notes_updated: notes !== undefined },
    })
  })
}

export async function issueInvoice(input: {
  actor: string
  invoiceId: string
  issueDate?: string | null
  dueDate?: string | null
}): Promise<void> {
  await withTransaction(async transaction => {
    const invoice = await lockInvoice(transaction, input.invoiceId)
    await issueLockedInvoice(transaction, invoice, input.actor, input.issueDate, input.dueDate)
  })
}

export async function voidInvoice(input: {
  actor: string
  invoiceId: string
  reason?: string | null
}): Promise<void> {
  await withTransaction(async transaction => {
    const invoice = await lockInvoice(transaction, input.invoiceId)
    if (invoice.status === 'void') return
    if (invoice.status === 'paid' || invoice.status === 'part_paid' || readMoney(invoice.amount_paid) > 0) {
      throw new BillingError(
        'An invoice with payments cannot be voided; reverse or credit the payment first',
        409,
        'invoice_has_payments'
      )
    }
    if (!['draft', 'issued'].includes(invoice.status)) {
      throw new BillingError('Invoice cannot be voided from its current status', 409)
    }
    const reason = input.reason === undefined || input.reason === null
      ? ''
      : cleanText(input.reason, 1000)
    await transaction.execute(
      `UPDATE Invoice
       SET status = 'void', voided_at = NOW(), paid_at = NULL, updated_at = NOW()
       WHERE id = ?`,
      [invoice.id]
    )
    // Retain the historical booking link but release the unique active claim so
    // a replacement invoice can be created deliberately.
    await transaction.execute(
      'UPDATE InvoiceLine SET booking_claim = NULL WHERE invoice_id = ?',
      [invoice.id]
    )
    await addBillingEvent(transaction, {
      eventType: 'invoice_voided',
      actor: input.actor,
      invoiceId: invoice.id,
      details: { reason },
    })
  })
}

export async function recordInvoicePayment(input: {
  actor: string
  invoiceId: string
  amountCents?: unknown
  paymentDate?: string | null
  method?: unknown
  reference?: unknown
  notes?: unknown
  idempotency: IdempotencyInput
}): Promise<IdempotentResult<PaymentResult>> {
  return withTransaction(transaction =>
    runIdempotently(transaction, input.idempotency, async () => {
      const invoice = await lockInvoice(transaction, input.invoiceId)
      if (invoice.status === 'void') {
        throw new BillingError('Payments cannot be recorded against a void invoice', 409)
      }
      if (invoice.status === 'paid' || readMoney(invoice.balance_due) === 0) {
        throw new BillingError('Invoice is already paid', 409, 'invoice_already_paid')
      }

      const paymentDate = optionalIsoDate(input.paymentDate, 'payment_date') ?? await databaseToday(transaction)
      const balanceBefore = readMoney(invoice.balance_due, 'invoice balance')
      const amount = input.amountCents === undefined || input.amountCents === null
        ? balanceBefore
        : assertPositiveMoney(input.amountCents, 'amount_cents')
      if (amount > balanceBefore) {
        throw new BillingError(
          'Payment cannot exceed the outstanding invoice balance',
          409,
          'payment_exceeds_balance'
        )
      }
      const method = cleanText(input.method, 50, 'manual') || 'manual'
      const reference = cleanText(input.reference, 191)
      const notes = input.notes === undefined || input.notes === null
        ? null
        : cleanText(input.notes, 5000)

      if (invoice.status === 'draft') {
        await issueLockedInvoice(transaction, invoice, input.actor, paymentDate, null)
      }

      const paymentId = newId()
      await transaction.execute(
        `INSERT INTO Payment
           (id, vendor_id, amount, currency, payment_date, method, reference,
            notes, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, NOW())`,
        [
          paymentId,
          invoice.vendor_id,
          amount,
          normaliseCurrency(invoice.currency),
          paymentDate,
          method,
          reference,
          notes,
          input.actor,
        ]
      )
      await transaction.execute(
        `INSERT INTO PaymentAllocation (id, payment_id, invoice_id, amount, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [newId(), paymentId, invoice.id, amount]
      )

      const totalAmount = readMoney(invoice.total_amount, 'invoice total')
      const paidBefore = readMoney(invoice.amount_paid, 'amount paid')
      const amountPaid = paidBefore + amount
      const balanceDue = totalAmount - amountPaid
      const status: InvoiceStatus = balanceDue === 0 ? 'paid' : 'part_paid'
      await transaction.execute(
        `UPDATE Invoice
         SET amount_paid = ?, balance_due = ?, status = ?,
             paid_at = IF(? = 0, NOW(), NULL), updated_at = NOW()
         WHERE id = ?`,
        [amountPaid, balanceDue, status, balanceDue, invoice.id]
      )
      await addBillingEvent(transaction, {
        eventType: 'payment_recorded',
        actor: input.actor,
        invoiceId: invoice.id,
        paymentId,
        details: {
          amount,
          currency: normaliseCurrency(invoice.currency),
          payment_date: paymentDate,
          method,
          reference,
          balance_due: balanceDue,
        },
      })

      const result: PaymentResult = {
        payment: {
          id: paymentId,
          amount,
          currency: normaliseCurrency(invoice.currency),
          payment_date: paymentDate,
          method,
          reference,
        },
        invoice: {
          id: invoice.id,
          public_id: invoice.public_id,
          status,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          paid_at: balanceDue === 0 ? paymentDate : null,
        },
      }
      return { value: result, statusCode: 201, resourceId: paymentId }
    })
  )
}
