'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId: string
  invoice: { id: string; public_id: string; status: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg text-ink-3 border-border',
  sent:  'bg-blue-50 text-blue-700 border-blue-200',
  paid:  'bg-success-bg text-success border-success/30',
  void:  'bg-red-50 text-red-500 border-red-200',
}

export default function BookingInvoiceSection({ bookingId, invoice }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createInvoice() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invoice')
      router.push(`/admin/invoices/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
      setCreating(false)
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl p-6 mt-6">
      <h2 className="font-display font-bold text-[16px] mb-4">Invoice</h2>
      {invoice ? (
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono font-bold text-accent text-[14px]">{invoice.public_id}</p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft}`}>
            {invoice.status}
          </span>
          <Link href={`/admin/invoices/${invoice.id}`} className="text-accent hover:underline font-medium text-[13px] ml-auto">
            View Invoice →
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-[13.5px] text-ink-3 mb-3">No invoice has been created for this booking yet.</p>
          <button
            onClick={createInvoice}
            disabled={creating}
            className="bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-60">
            {creating ? 'Creating…' : 'Create Invoice'}
          </button>
          {error && <p className="text-[12.5px] text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
