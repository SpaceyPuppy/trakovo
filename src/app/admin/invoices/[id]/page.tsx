import Link from 'next/link'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BillingError, getInvoice } from '@/lib/billing'
import { getSetting } from '@/lib/settings'
import { formatCurrencyCents } from '@/lib/utils'
import InvoiceActions from './InvoiceActions'

export const revalidate = 0

interface Props { params: { id: string } }

interface InvoiceDetail {
  id: string
  public_id: string
  billing_run_id: string | null
  booking_id: string | null
  vendor_id: string | null
  vendor_name: string | null
  invoice_type: string
  status: string
  currency: string
  issuer_name: string
  issuer_abn: string
  issuer_email: string
  issuer_phone: string
  issuer_address: string | null
  recipient_name: string
  recipient_abn: string
  recipient_email: string
  recipient_phone: string
  recipient_address: string | null
  issue_date: string | null
  due_date: string | null
  payment_terms_days: number
  tax_mode: string
  tax_rate_bps: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  notes: string | null
  issued_at: string | null
  paid_at: string | null
  voided_at: string | null
  created_at: string
}

interface InvoiceLine {
  id: string
  booking_id: string
  booking_public_id: string | null
  description: string
  service_start: string
  service_end: string
  quantity: number
  unit_amount: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  sort_order: number
}

interface InvoicePayment {
  id: string
  amount: number
  currency: string
  payment_date: string
  method: string
  reference: string | null
  notes: string | null
  status: string
  created_by: string
  created_at: string
}

interface InvoiceEvent {
  id: string
  event_type: string
  actor: string
  details: string | null
  created_at: string
}

const loadInvoice = cache(getInvoice)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const result = await loadInvoice(params.id)
    const invoice = result.invoice as unknown as InvoiceDetail
    return { title: `Invoice ${invoice.public_id}` }
  } catch {
    return { title: 'Invoice' }
  }
}

function formatDate(value: string | null, long = true): string {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg text-ink-3 border-border',
  issued: 'bg-blue-50 text-blue-700 border-blue-200',
  part_paid: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-success-bg text-success border-success/30',
  void: 'bg-red-50 text-red-600 border-red-200',
}

export default async function InvoiceDetailPage({ params }: Props) {
  let result: Awaited<ReturnType<typeof getInvoice>>
  let invoiceFooterTemplate: string | undefined
  try {
    const loaded = await Promise.all([
      loadInvoice(params.id),
      getSetting('billing_invoice_footer'),
    ])
    result = loaded[0]
    invoiceFooterTemplate = loaded[1]
  } catch (error) {
    if (error instanceof BillingError && error.status === 404) notFound()
    throw error
  }

  const invoice = result.invoice as unknown as InvoiceDetail
  const lines = result.lines as unknown as InvoiceLine[]
  const payments = result.payments as unknown as InvoicePayment[]
  const events = result.events as unknown as InvoiceEvent[]
  const displayIssueDate = invoice.issue_date ?? invoice.created_at.slice(0, 10)
  const invoiceFooter = invoiceFooterTemplate
    ?.replaceAll('{{invoice_number}}', invoice.public_id)
    .trim()

  return (
    <div className="px-5 py-8 md:px-10 md:py-10 print:p-0">
      <div className="flex items-center justify-between gap-4 mb-8 print:hidden flex-wrap">
        <Link href="/admin/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          ← Back to Billing &amp; Invoices
        </Link>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          balanceDue={invoice.balance_due}
          currency={invoice.currency}
          dueDate={invoice.due_date}
        />
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden max-w-[900px] print:border-0 print:rounded-none print:overflow-visible print:max-w-none">
        <div className="bg-slate px-6 py-6 md:px-8 print:bg-white print:border-b print:border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-extrabold text-[22px] tracking-tight text-white print:text-ink">{invoice.issuer_name}</p>
              {invoice.issuer_abn && <p className="text-[12px] text-white/60 print:text-ink-3 mt-1">ABN {invoice.issuer_abn}</p>}
              {invoice.issuer_email && <p className="text-[12px] text-white/60 print:text-ink-3">{invoice.issuer_email}</p>}
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-accent text-[18px]">{invoice.public_id}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize mt-1 ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft}`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 md:px-8 md:py-7 space-y-7 print:px-0 print:pb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-[13px]">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Invoice date</p>
              <p className="font-medium">{formatDate(displayIssueDate)}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Due date</p>
              <p className="font-medium">{formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Terms</p>
              <p className="font-medium">{invoice.payment_terms_days} days</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Type</p>
              <p className="font-medium capitalize">{invoice.invoice_type} invoice</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Bill to</p>
              <div className="bg-bg rounded-lg px-4 py-3 text-[13.5px] space-y-0.5 min-h-[92px] print:border print:border-border print:bg-white">
                <p className="font-semibold text-ink">{invoice.recipient_name}</p>
                {invoice.recipient_abn && <p className="text-ink-3">ABN {invoice.recipient_abn}</p>}
                {invoice.recipient_email && <p className="text-ink-3">{invoice.recipient_email}</p>}
                {invoice.recipient_phone && <p className="text-ink-3">{invoice.recipient_phone}</p>}
                {invoice.recipient_address && <p className="text-ink-3 whitespace-pre-line">{invoice.recipient_address}</p>}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Payment summary</p>
              <div className="bg-bg rounded-lg px-4 py-3 text-[13.5px] min-h-[92px] space-y-1 print:border print:border-border print:bg-white">
                <p className="flex justify-between gap-4"><span className="text-ink-3">Invoice total</span><strong>{formatCurrencyCents(invoice.total_amount, invoice.currency)}</strong></p>
                <p className="flex justify-between gap-4"><span className="text-ink-3">Paid</span><strong className="text-success">{formatCurrencyCents(invoice.amount_paid, invoice.currency)}</strong></p>
                <p className="flex justify-between gap-4 border-t border-border pt-1">
                  <span className="font-semibold">Balance due</span>
                  <strong>{invoice.status === 'void' ? 'Void — not payable' : formatCurrencyCents(invoice.balance_due, invoice.currency)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Services</p>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[650px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-border text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Service dates</th>
                    <th className="text-right py-2">Subtotal</th>
                    <th className="text-right py-2">Tax</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr key={line.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-ink">{line.description}</p>
                        {line.booking_id && (
                          <Link href={`/admin/bookings/${line.booking_id}`} className="font-mono text-[11.5px] text-accent hover:underline">
                            {line.booking_public_id || 'View booking'}
                          </Link>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-ink-3 whitespace-nowrap">{formatDate(line.service_start, false)} – {formatDate(line.service_end, false)}</td>
                      <td className="py-3 text-right">{formatCurrencyCents(line.subtotal_amount, invoice.currency)}</td>
                      <td className="py-3 text-right">{formatCurrencyCents(line.tax_amount, invoice.currency)}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrencyCents(line.total_amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-[13.5px]">
                  <tr><td colSpan={4} className="pt-3 text-right text-ink-3 pr-4">Subtotal</td><td className="pt-3 text-right">{formatCurrencyCents(invoice.subtotal_amount, invoice.currency)}</td></tr>
                  {invoice.tax_amount > 0 && <tr><td colSpan={4} className="pt-1 text-right text-ink-3 pr-4">GST included ({invoice.tax_rate_bps / 100}%)</td><td className="pt-1 text-right">{formatCurrencyCents(invoice.tax_amount, invoice.currency)}</td></tr>}
                  <tr><td colSpan={4} className="pt-2 text-right font-bold pr-4">Total</td><td className="pt-2 text-right font-bold text-[16px]">{formatCurrencyCents(invoice.total_amount, invoice.currency)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Notes</p>
              <p className="text-[13.5px] text-ink-3 leading-[1.6] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {invoiceFooter && (
            <div className="border-t border-border pt-5 break-inside-avoid">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Payment details</p>
              <p className="text-[13.5px] text-ink-2 leading-[1.65] whitespace-pre-wrap">{invoiceFooter}</p>
            </div>
          )}

          {payments.length > 0 && (
            <div className="print:hidden">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Payments</p>
              <div className="border border-border rounded-lg overflow-hidden">
                {payments.map(payment => (
                  <div key={payment.id} className="flex flex-wrap justify-between gap-3 px-4 py-3 border-b border-border last:border-0 text-[12.5px]">
                    <div>
                      <p className="font-semibold capitalize">{payment.method.replace('_', ' ')} · {formatDate(payment.payment_date, false)}</p>
                      <p className="text-ink-4">{payment.reference || 'No reference'}{payment.notes ? ` · ${payment.notes}` : ''}</p>
                    </div>
                    <p className="font-bold text-success">{formatCurrencyCents(payment.amount, payment.currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <details className="print:hidden border-t border-border pt-4 text-[12px] text-ink-4">
              <summary className="cursor-pointer font-semibold text-ink-3">Audit trail ({events.length})</summary>
              <ol className="mt-3 space-y-2">
                {events.map(event => (
                  <li key={event.id} className="flex flex-wrap justify-between gap-3">
                    <span className="capitalize">{event.event_type.replaceAll('_', ' ')} · {event.actor}</span>
                    <time>{new Date(event.created_at).toLocaleString('en-AU')}</time>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {invoice.status === 'void' && (
            <div className="text-center py-4"><span className="text-[40px] font-extrabold text-red-200 tracking-[0.2em]">VOID</span></div>
          )}
        </div>
      </div>
    </div>
  )
}
