import { query, queryOne } from '@/lib/db'
import { INVOICE_STATUSES, readMoney, type InvoiceStatus } from './core'
import { BillingError } from './errors'

interface InvoiceListRow {
  id: string
  public_id: string
  invoice_type: string
  status: InvoiceStatus
  currency: string
  recipient_name: string
  vendor_id: string | null
  vendor_name: string | null
  issue_date: string | null
  due_date: string | null
  total_amount: number | string
  amount_paid: number | string
  balance_due: number | string
  booking_count: number | string
  booking_refs: string | null
  created_at: string
}

function positiveInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return fallback
  return Math.min(parsed, maximum)
}

export async function listInvoices(input: {
  status?: string | null
  vendorId?: string | null
  limit?: unknown
  offset?: unknown
}) {
  const status = input.status?.trim() || null
  if (status && !INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    throw new BillingError('Invalid invoice status', 400)
  }
  const limit = positiveInteger(input.limit, 50, 100)
  const offset = positiveInteger(input.offset, 0, 100000)
  const clauses: string[] = []
  const values: unknown[] = []
  if (status) {
    clauses.push('i.status = ?')
    values.push(status)
  }
  if (input.vendorId) {
    clauses.push('i.vendor_id = ?')
    values.push(input.vendorId)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const [rows, countRow] = await Promise.all([
    query<InvoiceListRow>(
      `SELECT i.id, i.public_id, i.invoice_type, i.status, i.currency,
              i.recipient_name, i.vendor_id, v.name AS vendor_name,
              DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issue_date,
              DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
              i.total_amount, i.amount_paid, i.balance_due,
              (SELECT COUNT(*) FROM InvoiceLine count_line
               WHERE count_line.invoice_id = i.id) AS booking_count,
              (SELECT GROUP_CONCAT(ref_booking.public_id ORDER BY ref_line.sort_order SEPARATOR ', ')
               FROM InvoiceLine ref_line
               LEFT JOIN Booking ref_booking ON ref_booking.id = ref_line.booking_id
               WHERE ref_line.invoice_id = i.id) AS booking_refs,
              DATE_FORMAT(i.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
       FROM Invoice i
       LEFT JOIN Vendor v ON v.id = i.vendor_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    ),
    queryOne<{ count: number | string }>(
      `SELECT COUNT(*) AS count FROM Invoice i ${where}`,
      values
    ),
  ])

  return {
    invoices: rows.map(row => ({
      ...row,
      total_amount: readMoney(row.total_amount),
      amount_paid: readMoney(row.amount_paid),
      balance_due: readMoney(row.balance_due),
      booking_count: Number(row.booking_count),
    })),
    pagination: { limit, offset, total: Number(countRow?.count ?? 0) },
  }
}

export async function getInvoice(invoiceId: string) {
  const invoice = await queryOne<Record<string, unknown> & {
    total_amount: number | string
    subtotal_amount: number | string
    tax_amount: number | string
    amount_paid: number | string
    balance_due: number | string
  }>(
    `SELECT i.id, i.public_id, i.billing_run_id, i.booking_id, i.vendor_id,
            i.invoice_type, i.status, i.currency,
            i.issuer_name, i.issuer_abn, i.issuer_email, i.issuer_phone, i.issuer_address,
            i.recipient_name, i.recipient_abn, i.recipient_email,
            i.recipient_phone, i.recipient_address,
            DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issue_date,
            DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
            i.payment_terms_days, i.tax_mode, i.tax_rate_bps,
            i.subtotal_amount, i.tax_amount,
            i.total_amount, i.amount_paid, i.balance_due, i.notes,
            DATE_FORMAT(i.issued_at, '%Y-%m-%dT%H:%i:%s') AS issued_at,
            DATE_FORMAT(i.paid_at, '%Y-%m-%dT%H:%i:%s') AS paid_at,
            DATE_FORMAT(i.voided_at, '%Y-%m-%dT%H:%i:%s') AS voided_at,
            i.created_by,
            DATE_FORMAT(i.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            DATE_FORMAT(i.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
            v.name AS vendor_name
     FROM Invoice i
     LEFT JOIN Vendor v ON v.id = i.vendor_id
     WHERE i.id = ? LIMIT 1`,
    [invoiceId]
  )
  if (!invoice) throw new BillingError('Invoice not found', 404, 'invoice_not_found')

  const [lines, payments, events] = await Promise.all([
    query<Record<string, unknown> & {
      quantity: number | string
      unit_amount: number | string
      subtotal_amount: number | string
      tax_amount: number | string
      total_amount: number | string
    }>(
      `SELECT line.id, line.booking_id, b.public_id AS booking_public_id,
              line.description,
              DATE_FORMAT(line.service_start, '%Y-%m-%d') AS service_start,
              DATE_FORMAT(line.service_end, '%Y-%m-%d') AS service_end,
              line.quantity, line.unit_amount, line.subtotal_amount,
              line.tax_rate_bps, line.tax_amount, line.total_amount, line.sort_order
       FROM InvoiceLine line
       LEFT JOIN Booking b ON b.id = line.booking_id
       WHERE line.invoice_id = ?
       ORDER BY line.sort_order, line.created_at`,
      [invoiceId]
    ),
    query<Record<string, unknown> & { amount: number | string }>(
      `SELECT p.id, allocation.amount, p.currency,
              DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
              p.method, p.reference, p.notes, p.status, p.created_by,
              DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
       FROM PaymentAllocation allocation
       JOIN Payment p ON p.id = allocation.payment_id
       WHERE allocation.invoice_id = ?
       ORDER BY p.payment_date, p.created_at`,
      [invoiceId]
    ),
    query<Record<string, unknown>>(
      `SELECT id, event_type, actor, details,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
       FROM BillingEvent
       WHERE invoice_id = ?
       ORDER BY created_at, id`,
      [invoiceId]
    ),
  ])

  return {
    invoice: {
      ...invoice,
      subtotal_amount: readMoney(invoice.subtotal_amount),
      tax_amount: readMoney(invoice.tax_amount),
      total_amount: readMoney(invoice.total_amount),
      amount_paid: readMoney(invoice.amount_paid),
      balance_due: readMoney(invoice.balance_due),
    },
    lines: lines.map(line => ({
      ...line,
      quantity: Number(line.quantity),
      unit_amount: readMoney(line.unit_amount),
      subtotal_amount: readMoney(line.subtotal_amount),
      tax_amount: readMoney(line.tax_amount),
      total_amount: readMoney(line.total_amount),
    })),
    payments: payments.map(payment => ({ ...payment, amount: readMoney(payment.amount) })),
    events,
  }
}

export async function getBillingRun(runId: string) {
  const run = await queryOne<Record<string, unknown> & {
    invoice_count: number | string
    booking_count: number | string
    total_amount: number | string
  }>(
    `SELECT id, status, DATE_FORMAT(cutoff_date, '%Y-%m-%d') AS cutoff_date,
            vendor_filter, invoice_count, booking_count, total_amount, currency,
            notes, created_by,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            DATE_FORMAT(completed_at, '%Y-%m-%dT%H:%i:%s') AS completed_at
     FROM BillingRun WHERE id = ? LIMIT 1`,
    [runId]
  )
  if (!run) throw new BillingError('Billing run not found', 404, 'billing_run_not_found')
  const invoices = await query<{
    id: string
    public_id: string
    vendor_id: string | null
    recipient_name: string
    status: InvoiceStatus
    total_amount: number | string
    balance_due: number | string
    currency: string
    booking_count: number | string
  }>(
    `SELECT i.id, i.public_id, i.vendor_id, i.recipient_name, i.status,
            i.total_amount, i.balance_due, i.currency,
            (SELECT COUNT(*) FROM InvoiceLine count_line
             WHERE count_line.invoice_id = i.id) AS booking_count
     FROM Invoice i
     WHERE i.billing_run_id = ?
     ORDER BY i.recipient_name`,
    [runId]
  )
  return {
    run: {
      ...run,
      invoice_count: Number(run.invoice_count),
      booking_count: Number(run.booking_count),
      total_amount: readMoney(run.total_amount),
    },
    invoices: invoices.map(invoice => ({
      ...invoice,
      total_amount: readMoney(invoice.total_amount),
      balance_due: readMoney(invoice.balance_due),
      booking_count: Number(invoice.booking_count),
    })),
  }
}
