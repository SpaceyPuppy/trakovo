'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrencyCents } from '@/lib/utils'

interface Props {
  invoiceId: string
  status: string
  balanceDue: number
  currency: string
  dueDate: string | null
}

const btn = 'border border-border text-ink-3 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors whitespace-nowrap disabled:opacity-50'
const btnDanger = 'border border-red-200 text-red-600 font-medium text-[13px] px-4 py-2 rounded-[6px] hover:border-red-400 transition-colors whitespace-nowrap disabled:opacity-50'
const btnPrimary = 'bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors whitespace-nowrap disabled:opacity-50'

function todayLocal(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  return body && typeof body === 'object' ? body as Record<string, unknown> : {}
}

export default function InvoiceActions({ invoiceId, status, balanceDue, currency, dueDate }: Props) {
  const router = useRouter()
  const paymentKey = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showDueDate, setShowDueDate] = useState(false)
  const [draftDueDate, setDraftDueDate] = useState(dueDate ?? '')
  const [amount, setAmount] = useState((balanceDue / 100).toFixed(2))
  const [paymentDate, setPaymentDate] = useState(todayLocal)
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function updateInvoice(action: 'issue' | 'void') {
    if (action === 'void' && !window.confirm('Void this invoice? This cannot be used to erase recorded payments.')) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'issue'
          ? { action, due_date: draftDueDate || undefined }
          : { action, reason: 'Voided by administrator' }),
      })
      const body = await jsonBody(response)
      if (!response.ok) throw new Error(String(body.error ?? 'Invoice update failed'))
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invoice update failed')
    } finally {
      setLoading(false)
    }
  }

  async function saveDueDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', due_date: draftDueDate || null }),
      })
      const body = await jsonBody(response)
      if (!response.ok) throw new Error(String(body.error ?? 'Due date could not be updated'))
      setShowDueDate(false)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Due date could not be updated')
    } finally {
      setLoading(false)
    }
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountCents = Math.round(Number(amount) * 100)
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      setError('Enter a valid payment amount greater than zero.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      paymentKey.current ??= crypto.randomUUID()
      const response = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': paymentKey.current,
        },
        body: JSON.stringify({
          amount_cents: amountCents,
          payment_date: paymentDate,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const body = await jsonBody(response)
      if (!response.ok) throw new Error(String(body.error ?? 'Payment could not be recorded'))
      paymentKey.current = null
      setShowPayment(false)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Payment could not be recorded')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap print:hidden max-w-[720px]">
      {status === 'draft' && <button type="button" onClick={() => updateInvoice('issue')} disabled={loading} className={btn}>Issue invoice</button>}
      {status === 'draft' && <button type="button" onClick={() => setShowDueDate(current => !current)} disabled={loading} className={btn}>{dueDate ? 'Edit due date' : 'Set due date'}</button>}
      {!['paid', 'void'].includes(status) && balanceDue > 0 && (
        <button type="button" onClick={() => setShowPayment(current => !current)} disabled={loading} className={btnPrimary}>
          Record payment
        </button>
      )}
      {['draft', 'issued'].includes(status) && (
        <button type="button" onClick={() => updateInvoice('void')} disabled={loading} className={btnDanger}>Void</button>
      )}
      <button type="button" onClick={() => window.print()} className={btn}>Print / Save PDF</button>

      {showDueDate && (
        <form onSubmit={saveDueDate} className="basis-full bg-white border border-border rounded-lg p-4 flex flex-wrap items-end gap-3 text-left shadow-sm">
          <label className="text-[11.5px] font-semibold text-ink-3">
            Due date
            <input type="date" min={todayLocal()} value={draftDueDate} onChange={event => setDraftDueDate(event.target.value)} className="mt-1 block border border-border rounded-md px-2.5 py-2 text-[13px]" />
          </label>
          <button type="submit" disabled={loading} className={btnPrimary}>{loading ? 'Saving…' : 'Save due date'}</button>
          <button type="button" disabled={loading} onClick={() => { setDraftDueDate(dueDate ?? ''); setShowDueDate(false) }} className={btn}>Cancel</button>
        </form>
      )}

      {showPayment && (
        <form onSubmit={recordPayment} className="basis-full bg-white border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-left shadow-sm">
          <p className="col-span-2 md:col-span-4 text-[12.5px] text-ink-3">
            Balance due: <strong className="text-ink">{formatCurrencyCents(balanceDue, currency)}</strong>
          </p>
          <label className="text-[11.5px] font-semibold text-ink-3">
            Amount ({currency})
            <input type="number" min="0.01" step="0.01" max={(balanceDue / 100).toFixed(2)} required value={amount} onChange={event => { paymentKey.current = null; setAmount(event.target.value) }} className="mt-1 w-full border border-border rounded-md px-2.5 py-2 text-[13px]" />
          </label>
          <label className="text-[11.5px] font-semibold text-ink-3">
            Payment date
            <input type="date" required value={paymentDate} onChange={event => { paymentKey.current = null; setPaymentDate(event.target.value) }} className="mt-1 w-full border border-border rounded-md px-2.5 py-2 text-[13px]" />
          </label>
          <label className="text-[11.5px] font-semibold text-ink-3">
            Method
            <select value={method} onChange={event => { paymentKey.current = null; setMethod(event.target.value) }} className="mt-1 w-full border border-border rounded-md px-2.5 py-2 text-[13px] bg-white">
              <option value="bank_transfer">Bank transfer</option>
              <option value="card_external">Card (external)</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-[11.5px] font-semibold text-ink-3">
            Reference
            <input value={reference} maxLength={191} onChange={event => { paymentKey.current = null; setReference(event.target.value) }} className="mt-1 w-full border border-border rounded-md px-2.5 py-2 text-[13px]" />
          </label>
          <label className="col-span-2 md:col-span-3 text-[11.5px] font-semibold text-ink-3">
            Note (optional)
            <input value={notes} maxLength={2000} onChange={event => { paymentKey.current = null; setNotes(event.target.value) }} className="mt-1 w-full border border-border rounded-md px-2.5 py-2 text-[13px]" />
          </label>
          <div className="col-span-2 md:col-span-1 flex items-end gap-2">
            <button type="submit" disabled={loading} className={`${btnPrimary} flex-1`}>{loading ? 'Saving…' : 'Save payment'}</button>
          </div>
        </form>
      )}
      {error && <p className="basis-full text-right text-[12.5px] text-red-600">{error}</p>}
    </div>
  )
}
