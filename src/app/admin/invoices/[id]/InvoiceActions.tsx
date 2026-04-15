'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  invoiceId: string
  status: string
}

const btn = 'border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors whitespace-nowrap'
const btnDanger = 'border border-red-200 text-red-500 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-red-400 hover:text-red-700 transition-colors whitespace-nowrap'
const btnPrimary = 'bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors whitespace-nowrap'

export default function InvoiceActions({ invoiceId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Update failed')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      {status === 'draft' && (
        <button onClick={() => updateStatus('sent')} disabled={loading} className={btn}>
          Mark as Sent
        </button>
      )}
      {(status === 'draft' || status === 'sent') && (
        <button onClick={() => updateStatus('paid')} disabled={loading} className={btnPrimary}>
          Mark as Paid
        </button>
      )}
      {status !== 'void' && status !== 'paid' && (
        <button onClick={() => updateStatus('void')} disabled={loading} className={btnDanger}>
          Void
        </button>
      )}
      {status === 'paid' && (
        <button onClick={() => updateStatus('void')} disabled={loading} className={btnDanger}>
          Void
        </button>
      )}
      <button
        onClick={() => window.print()}
        className={btn}
      >
        Print / Save PDF
      </button>
      {error && <p className="text-[12.5px] text-red-600 w-full">{error}</p>}
    </div>
  )
}
