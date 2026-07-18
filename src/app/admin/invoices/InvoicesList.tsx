'use client'

import Link from 'next/link'
import { formatCurrencyCents } from '@/lib/utils'

interface InvoiceRow {
  id: string
  public_id: string
  invoice_type: string
  status: string
  currency: string
  recipient_name: string
  vendor_id: string | null
  vendor_name: string | null
  issue_date: string | null
  due_date: string | null
  total_amount: number
  amount_paid: number
  balance_due: number
  booking_count: number
  booking_refs: string | null
  created_at: string
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'issued', label: 'Issued' },
  { key: 'part_paid', label: 'Part paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
] as const

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg text-ink-3 border-border',
  issued: 'bg-blue-50 text-blue-700 border-blue-200',
  part_paid: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-success-bg text-success border-success/30',
  void: 'bg-red-50 text-red-600 border-red-200',
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(invoice: InvoiceRow): boolean {
  if (!invoice.due_date || ['paid', 'void'].includes(invoice.status)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${invoice.due_date}T00:00:00`) < today
}

export default function InvoicesList({
  invoices,
  currentPage,
  total,
  pageSize,
  status,
}: {
  invoices: InvoiceRow[]
  currentPage: number
  total: number
  pageSize: number
  status: string
}) {
  const pageHref = (page: number) => status === 'all'
    ? `/admin/invoices?page=${page}`
    : `/admin/invoices?status=${encodeURIComponent(status)}&page=${page}`

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-bg border border-border rounded-lg p-1 w-fit max-w-full overflow-x-auto">
        {TABS.map(item => (
          <Link
            key={item.key}
            href={item.key === 'all' ? '/admin/invoices' : `/admin/invoices?status=${item.key}`}
            className={`px-3 py-1.5 rounded-[5px] text-[13px] font-semibold whitespace-nowrap transition-colors ${
              status === item.key ? 'bg-white shadow-sm text-ink' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-x-auto">
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13.5px] text-ink-4">No invoices in this category.</div>
        ) : (
          <table className="w-full min-w-[880px] text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Invoice</th>
                <th className="text-left px-5 py-3">Recipient</th>
                <th className="text-left px-5 py-3">Bookings</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-right px-5 py-3">Balance</th>
                <th className="text-left px-5 py-3">Due</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => {
                const overdue = isOverdue(invoice)
                return (
                  <tr key={invoice.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-[12.5px] text-accent">{invoice.public_id}</span>
                      <p className="text-[11px] text-ink-4 mt-0.5 capitalize">
                        {invoice.invoice_type} · {new Date(invoice.created_at).toLocaleDateString('en-AU')}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{invoice.recipient_name}</p>
                      {invoice.vendor_name && invoice.vendor_name !== invoice.recipient_name && (
                        <p className="text-[11.5px] text-ink-4">Vendor: {invoice.vendor_name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-[240px]">
                      <p className="text-ink-2">{invoice.booking_count} booking{invoice.booking_count === 1 ? '' : 's'}</p>
                      <p className="font-mono text-[11px] text-ink-4 truncate" title={invoice.booking_refs ?? ''}>
                        {invoice.booking_refs || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {formatCurrencyCents(invoice.total_amount, invoice.currency)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {invoice.status === 'void' ? '—' : formatCurrencyCents(invoice.balance_due, invoice.currency)}
                    </td>
                    <td className="px-5 py-3">
                      {invoice.due_date ? (
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-ink-3'}>
                          {formatDate(invoice.due_date)}
                          {overdue && <span className="block text-[10px] font-bold">OVERDUE</span>}
                        </span>
                      ) : <span className="text-ink-4">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/invoices/${invoice.id}`} className="text-accent hover:underline font-medium text-[13px]">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between gap-4 text-[12.5px]">
          <p className="text-ink-4">Page {currentPage} of {Math.ceil(total / pageSize)}</p>
          <div className="flex gap-2">
            {currentPage > 1 && <Link href={pageHref(currentPage - 1)} className="border border-border rounded-md px-3 py-2 font-semibold text-ink-3 hover:text-ink">← Newer</Link>}
            {currentPage * pageSize < total && <Link href={pageHref(currentPage + 1)} className="border border-border rounded-md px-3 py-2 font-semibold text-ink-3 hover:text-ink">Older →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
