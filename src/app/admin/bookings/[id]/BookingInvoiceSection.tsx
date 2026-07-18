'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId: string
  bookingStatus: string
  vendorId: string | null
  invoice: {
    id: string
    public_id: string
    status: string
    invoice_type: string
    balance_due: number
  } | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg text-ink-3 border-border',
  issued: 'bg-blue-50 text-blue-700 border-blue-200',
  part_paid: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-success-bg text-success border-success/30',
  void: 'bg-red-50 text-red-600 border-red-200',
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  return body && typeof body === 'object' ? body as Record<string, unknown> : {}
}

export default function BookingInvoiceSection({ bookingId, bookingStatus, vendorId, invoice }: Props) {
  const router = useRouter()
  const createKey = useRef<string | null>(null)
  const paymentKey = useRef<string | null>(null)
  const [working, setWorking] = useState<'create' | 'pay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function createInvoice(): Promise<string> {
    createKey.current ??= crypto.randomUUID()
    const response = await fetch('/api/admin/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': createKey.current,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const body = await responseBody(response)
    if (!response.ok) throw new Error(String(body.error ?? 'Failed to create invoice'))
    createKey.current = null
    if (typeof body.id !== 'string') throw new Error('Invoice was created without an ID')
    return body.id
  }

  async function recordFullPayment(invoiceId: string) {
    paymentKey.current ??= crypto.randomUUID()
    const response = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': paymentKey.current,
      },
      body: JSON.stringify({ method: 'other', notes: 'Marked paid from booking details' }),
    })
    const body = await responseBody(response)
    if (!response.ok) throw new Error(String(body.error ?? 'Failed to record payment'))
    paymentKey.current = null
  }

  async function handleCreate() {
    setWorking('create')
    setError(null)
    try {
      const invoiceId = await createInvoice()
      router.push(`/admin/invoices/${invoiceId}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to create invoice')
      setWorking(null)
    }
  }

  async function handleMarkPaid() {
    if (!window.confirm('Record the full outstanding amount as paid?')) return
    setWorking('pay')
    setError(null)
    try {
      const invoiceId = invoice?.id ?? await createInvoice()
      await recordFullPayment(invoiceId)
      router.push(`/admin/invoices/${invoiceId}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to mark booking paid')
      setWorking(null)
      router.refresh()
    }
  }

  const directInvoice = !vendorId || invoice?.invoice_type === 'direct'
  const canPayDirectly = directInvoice && invoice?.status !== 'paid' && invoice?.status !== 'void'
  const bookingCanBeInvoiced = !['cancelled', 'enquiry'].includes(bookingStatus)

  return (
    <div className="bg-white border border-border rounded-xl p-6 mt-6">
      <h2 className="font-display font-bold text-[16px] mb-4">Billing</h2>
      {invoice ? (
        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="font-mono font-bold text-accent text-[14px]">{invoice.public_id}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft}`}>
              {invoice.status.replace('_', ' ')}
            </span>
            {invoice.invoice_type === 'vendor' && <span className="text-[11px] text-ink-4">Consolidated vendor invoice</span>}
            <Link href={`/admin/invoices/${invoice.id}`} className="text-accent hover:underline font-medium text-[13px] ml-auto">
              View invoice →
            </Link>
          </div>
          {canPayDirectly && invoice.balance_due > 0 && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={working !== null}
              className="mt-4 bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark disabled:opacity-60"
            >
              {working === 'pay' ? 'Recording payment…' : 'Mark booking paid in full'}
            </button>
          )}
        </div>
      ) : vendorId ? (
        <div>
          <p className="text-[13.5px] text-ink-3">
            {bookingStatus === 'completed'
              ? 'This completed vendor booking is ready for the next reviewed bill run once it has a valid price.'
              : 'Vendor bookings are added to the bill-run queue after they are marked completed and have a valid price.'}
          </p>
          <Link href="/admin/invoices" className="inline-block mt-3 text-accent hover:underline font-medium text-[13px]">
            Open Billing &amp; Invoices →
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-[13.5px] text-ink-3 mb-3">
            {bookingCanBeInvoiced
              ? 'No invoice has been created for this direct booking.'
              : 'Cancelled bookings and enquiries cannot be invoiced.'}
          </p>
          {bookingCanBeInvoiced && <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={working !== null}
              className="border border-border text-ink-2 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 disabled:opacity-60"
            >
              {working === 'create' ? 'Creating…' : 'Create draft invoice'}
            </button>
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={working !== null}
              className="bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark disabled:opacity-60"
            >
              {working === 'pay' ? 'Recording payment…' : 'Mark booking paid in full'}
            </button>
          </div>}
        </div>
      )}
      {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}
    </div>
  )
}
