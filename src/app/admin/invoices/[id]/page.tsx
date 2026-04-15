import Link from 'next/link'
import { notFound } from 'next/navigation'
import { queryOne } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import InvoiceActions from './InvoiceActions'
import type { Metadata } from 'next'

export const revalidate = 0

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inv = await queryOne<{ public_id: string }>('SELECT public_id FROM Invoice WHERE id = ? LIMIT 1', [params.id])
  return { title: inv ? `Invoice ${inv.public_id}` : 'Invoice' }
}

export default async function InvoiceDetailPage({ params }: Props) {
  const [inv, siteSetting] = await Promise.all([
    queryOne<{
      id: string; public_id: string; booking_id: string; amount: number; currency: string;
      status: string; due_date: string | null; paid_at: Date | string | null; notes: string | null;
      created_at: Date | string;
      booking_public_id: string; contact_name: string | null; contact_email: string; contact_phone: string;
      hire_type: string; service_type: string | null; start_date: string; end_date: string;
      total_days: number; daily_rate: number; total_cost: number;
      vehicle_name: string | null; vendor_name: string | null; vendor_email: string | null;
    }>(
      `SELECT i.id, i.public_id, i.booking_id, i.amount, i.currency, i.status,
              i.due_date, i.paid_at, i.notes, i.created_at,
              b.public_id as booking_public_id, b.contact_name, b.contact_email, b.contact_phone,
              b.hire_type, b.service_type, b.start_date, b.end_date,
              b.total_days, b.daily_rate, b.total_cost,
              v.name as vehicle_name, ve.name as vendor_name, ve.contact_email as vendor_email
       FROM Invoice i
       JOIN Booking b ON i.booking_id = b.id
       LEFT JOIN Vehicle v ON b.vehicle_id = v.id
       LEFT JOIN Vendor ve ON b.vendor_id = ve.id
       WHERE i.id = ? LIMIT 1`,
      [params.id]
    ),
    queryOne<{ value: string }>('SELECT value FROM Setting WHERE `key` = \'site_name\' LIMIT 1'),
  ])

  if (!inv) notFound()

  const siteName = siteSetting?.value ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'

  const createdAt = inv.created_at instanceof Date ? inv.created_at : new Date(String(inv.created_at))
  const paidAt = inv.paid_at ? (inv.paid_at instanceof Date ? inv.paid_at : new Date(String(inv.paid_at))) : null

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const isVendor = !!inv.vendor_name
  const recipientName = isVendor ? inv.vendor_name! : (inv.contact_name ?? '—')
  const recipientEmail = isVendor ? inv.vendor_email : inv.contact_email

  const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-bg text-ink-3 border-border',
    sent:  'bg-blue-50 text-blue-700 border-blue-200',
    paid:  'bg-success-bg text-success border-success/30',
    void:  'bg-red-50 text-red-500 border-red-200',
  }

  const hireLabel = inv.service_type === 'taxi' ? 'Taxi' : inv.hire_type.replace('-', ' ')

  return (
    <div className="px-10 py-10">
      {/* Back + actions — hidden on print */}
      <div className="flex items-center justify-between gap-4 mb-8 print:hidden flex-wrap">
        <Link href="/admin/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
          ← Back to Invoices
        </Link>
        <InvoiceActions invoiceId={inv.id} status={inv.status} />
      </div>

      {/* Invoice card */}
      <div className="bg-white border border-border rounded-xl overflow-hidden max-w-[760px] print:border-none print:shadow-none print:max-w-full">
        {/* Header bar */}
        <div className="bg-slate px-8 py-6 print:bg-white print:border-b print:border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-extrabold text-[22px] tracking-tight text-white print:text-ink">{siteName}</p>
              <p className="text-[13px] text-white/50 print:text-ink-3 mt-0.5 capitalize">{hireLabel} Hire Services</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-accent text-[18px]">{inv.public_id}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize mt-1 ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}>
                {inv.status}
              </span>
            </div>
          </div>
        </div>

        <div className="px-8 py-7 space-y-7">
          {/* Meta row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[13px]">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Invoice Date</p>
              <p className="font-medium">{createdAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Due Date</p>
              <p className="font-medium">{inv.due_date ? fmtDate(inv.due_date) : '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Booking Ref</p>
              <p className="font-mono font-bold text-accent">{inv.booking_public_id}</p>
            </div>
            {paidAt && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-1">Paid</p>
                <p className="font-medium text-success">{paidAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Bill To</p>
            <div className="bg-bg rounded-lg px-4 py-3 text-[13.5px] space-y-0.5">
              <p className="font-semibold text-ink">{recipientName}</p>
              {recipientEmail && <p className="text-ink-3">{recipientEmail}</p>}
              {!isVendor && inv.contact_phone && <p className="text-ink-3">{inv.contact_phone}</p>}
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Services</p>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ink">
                      {inv.vehicle_name ?? (inv.service_type === 'taxi' ? 'Taxi Service' : 'Vehicle Hire')}
                    </p>
                    <p className="text-[12px] text-ink-3 mt-0.5 capitalize">
                      {hireLabel} · {fmtDate(inv.start_date)} → {fmtDate(inv.end_date)}
                    </p>
                  </td>
                  <td className="py-3 text-right text-ink-3">{inv.total_days} day{inv.total_days !== 1 ? 's' : ''}</td>
                  <td className="py-3 text-right text-ink-3">{formatCurrency(inv.daily_rate, inv.currency)}/day</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(inv.total_cost, inv.currency)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-4 text-right font-semibold text-[14px] pr-4">Total</td>
                  <td className="pt-4 text-right font-bold text-[16px]">{formatCurrency(inv.amount, inv.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {inv.notes && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-4 mb-2">Notes</p>
              <p className="text-[13.5px] text-ink-3 leading-[1.6] whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}

          {/* Void watermark */}
          {inv.status === 'void' && (
            <div className="text-center py-4">
              <span className="text-[40px] font-extrabold text-red-200 tracking-[0.2em] uppercase">VOID</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
