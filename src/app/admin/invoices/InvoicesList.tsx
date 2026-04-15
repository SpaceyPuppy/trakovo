'use client'
import Link from 'next/link'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface InvoiceRow {
  id: string
  public_id: string
  booking_public_id: string
  amount: number
  currency: string
  status: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  contact_name: string | null
  contact_email: string
  vehicle_name: string | null
  vendor_name: string | null
  hire_type: string
  service_type: string | null
  start_date: string
  end_date: string
}

const TABS = [
  { key: 'all',   label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent',  label: 'Sent' },
  { key: 'paid',  label: 'Paid' },
  { key: 'void',  label: 'Void' },
] as const

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg text-ink-3 border-border',
  sent:  'bg-blue-50 text-blue-700 border-blue-200',
  paid:  'bg-success-bg text-success border-success/30',
  void:  'bg-red-50 text-red-500 border-red-200',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(inv: InvoiceRow) {
  return inv.due_date && inv.status !== 'paid' && inv.status !== 'void'
    && new Date(inv.due_date + 'T00:00:00') < new Date()
}

export default function InvoicesList({ invoices }: { invoices: InvoiceRow[] }) {
  const [tab, setTab] = useState<string>('all')

  const counts = Object.fromEntries(
    TABS.map(t => [t.key, t.key === 'all' ? invoices.length : invoices.filter(inv => inv.status === t.key).length])
  )
  const filtered = tab === 'all' ? invoices : invoices.filter(inv => inv.status === tab)

  function recipientLabel(inv: InvoiceRow) {
    if (inv.vendor_name) return inv.vendor_name
    return inv.contact_name ?? inv.contact_email
  }

  function bookingLabel(inv: InvoiceRow) {
    if (inv.service_type === 'taxi') return 'Taxi Request'
    if (inv.vendor_name) return `B2B – ${inv.vendor_name}`
    return inv.vehicle_name ?? 'Unknown Vehicle'
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-bg border border-border rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-[5px] text-[13px] font-semibold transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-ink' : 'text-ink-3 hover:text-ink'
            }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-accent/10 text-accent' : 'bg-border text-ink-4'
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13.5px] text-ink-4">No invoices in this category.</div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-bg text-ink-4 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="text-left px-6 py-3">Invoice</th>
                <th className="text-left px-6 py-3">Booking</th>
                <th className="text-left px-6 py-3">Recipient</th>
                <th className="text-left px-6 py-3">For</th>
                <th className="text-left px-6 py-3">Amount</th>
                <th className="text-left px-6 py-3">Due</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const overdue = isOverdue(inv)
                return (
                  <tr key={inv.id} className="border-t border-border hover:bg-bg/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono font-bold text-[12.5px] text-accent">{inv.public_id}</span>
                      <p className="text-[11px] text-ink-4 mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-[12.5px] text-ink-2">{inv.booking_public_id}</span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-ink">{recipientLabel(inv)}</p>
                      {!inv.vendor_name && <p className="text-[12px] text-ink-4">{inv.contact_email}</p>}
                    </td>
                    <td className="px-6 py-3 text-ink-3">{bookingLabel(inv)}</td>
                    <td className="px-6 py-3 font-semibold text-ink">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="px-6 py-3">
                      {inv.due_date ? (
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-ink-3'}>
                          {fmtDate(inv.due_date)}
                          {overdue && <span className="ml-1 text-[10px] font-bold">OVERDUE</span>}
                        </span>
                      ) : (
                        <span className="text-ink-4">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/invoices/${inv.id}`} className="text-accent hover:underline font-medium text-[13px]">
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
    </div>
  )
}
