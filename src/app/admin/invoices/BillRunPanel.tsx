'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrencyCents } from '@/lib/utils'

interface ReadyBooking {
  id: string
  public_id: string
  contact_name: string | null
  vehicle_name: string | null
  start_date: string
  end_date: string
  total_amount: number
  currency: string
}

interface ReadyVendor {
  vendor: {
    id: string
    name: string
    billing_name: string
    billing_email: string
    billing_terms_days: number
  }
  booking_count: number
  total_amount: number
  currency: string
  bookings: ReadyBooking[]
}

interface AttentionBooking extends ReadyBooking {
  vendor_id: string
  vendor_name: string
  reason: 'needs_price' | 'billing_disabled' | 'currency_mismatch'
}

interface Readiness {
  cutoff_date: string
  vendor_count: number
  booking_count: number
  total_amount: number
  vendors: ReadyVendor[]
  needs_attention: AttentionBooking[]
}

interface CreatedRun {
  run: {
    id: string
    cutoff_date: string
    status: 'completed' | 'empty'
    invoice_count: number
    booking_count: number
    total_amount: number
    currency: string
  }
  invoices: Array<{
    id: string
    public_id: string
    vendor_id: string | null
    booking_count: number
    total_amount: number
    currency: string
  }>
}

function todayLocal(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function attentionReason(reason: AttentionBooking['reason']): string {
  if (reason === 'needs_price') return 'Price required'
  if (reason === 'billing_disabled') return 'Vendor billing disabled'
  return 'Currency does not match vendor'
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  return body && typeof body === 'object' ? body as Record<string, unknown> : {}
}

export default function BillRunPanel() {
  const router = useRouter()
  const runKey = useRef<string | null>(null)
  const [cutoff, setCutoff] = useState(todayLocal)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([])
  const [created, setCreated] = useState<CreatedRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reviewReadyBookings() {
    setLoading(true)
    setError(null)
    setCreated(null)
    try {
      const response = await fetch(`/api/admin/billing/ready?cutoff=${encodeURIComponent(cutoff)}`, {
        cache: 'no-store',
      })
      const body = await responseJson(response)
      if (!response.ok) throw new Error(String(body.error ?? 'Could not review billable bookings'))
      const next = body as unknown as Readiness
      setReadiness(next)
      const firstCurrency = next.vendors[0]?.currency
      setSelectedVendorIds(next.vendors
        .filter(item => item.currency === firstCurrency)
        .map(item => item.vendor.id))
      runKey.current = null
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not review billable bookings')
    } finally {
      setLoading(false)
    }
  }

  function toggleVendor(vendorId: string) {
    runKey.current = null
    setSelectedVendorIds(current => {
      if (current.includes(vendorId)) return current.filter(id => id !== vendorId)
      const vendor = readiness?.vendors.find(item => item.vendor.id === vendorId)
      const selectedCurrency = readiness?.vendors.find(item => current.includes(item.vendor.id))?.currency
      if (selectedCurrency && vendor?.currency !== selectedCurrency) return [vendorId]
      return [...current, vendorId]
    })
  }

  async function createRun() {
    if (!readiness || selectedVendorIds.length === 0) return
    setCreating(true)
    setError(null)
    try {
      runKey.current ??= crypto.randomUUID()
      const response = await fetch('/api/admin/billing/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': runKey.current,
        },
        body: JSON.stringify({
          cutoff_date: readiness.cutoff_date,
          vendor_ids: selectedVendorIds,
          reviewed_bookings: readiness.vendors
            .filter(item => selectedVendorIds.includes(item.vendor.id))
            .flatMap(item => item.bookings.map(booking => ({
              id: booking.id,
              vendor_id: item.vendor.id,
              total_amount: booking.total_amount,
              currency: booking.currency,
            }))),
          due_date: dueDate || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const body = await responseJson(response)
      if (!response.ok) throw new Error(String(body.error ?? 'Bill run failed'))
      setCreated(body as unknown as CreatedRun)
      setReadiness(null)
      setSelectedVendorIds([])
      runKey.current = null
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bill run failed')
    } finally {
      setCreating(false)
    }
  }

  const selectedVendors = readiness?.vendors.filter(item => selectedVendorIds.includes(item.vendor.id)) ?? []
  const selectedBookings = selectedVendors.reduce((sum, item) => sum + item.booking_count, 0)
  const selectedTotal = selectedVendors.reduce((sum, item) => sum + item.total_amount, 0)
  const currency = selectedVendors[0]?.currency ?? 'AUD'

  return (
    <section className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-border bg-bg/40">
        <h2 className="font-display font-bold text-[17px]">Vendor bill run</h2>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Completed, priced vendor bookings are queued automatically. Review them before creating draft invoices.
        </p>
      </div>

      <div className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[190px_190px_1fr_auto] md:items-end">
          <label className="block text-[12.5px] font-semibold text-ink-2">
            Include work completed by
            <input
              type="date"
              value={cutoff}
              onChange={event => {
                runKey.current = null
                setCutoff(event.target.value)
                setReadiness(null)
                setSelectedVendorIds([])
                setCreated(null)
              }}
              className="mt-1.5 w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white"
            />
          </label>
          <label className="block text-[12.5px] font-semibold text-ink-2">
            Override due date <span className="font-normal text-ink-4">(optional)</span>
            <input
              type="date"
              value={dueDate}
              min={todayLocal()}
              onChange={event => { runKey.current = null; setDueDate(event.target.value) }}
              className="mt-1.5 w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white"
            />
          </label>
          <label className="block text-[12.5px] font-semibold text-ink-2">
            Internal run note <span className="font-normal text-ink-4">(optional)</span>
            <input
              value={notes}
              onChange={event => { runKey.current = null; setNotes(event.target.value) }}
              maxLength={2000}
              placeholder="e.g. Fortnight ending 17 July"
              className="mt-1.5 w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white"
            />
          </label>
          <button
            type="button"
            onClick={reviewReadyBookings}
            disabled={loading || !cutoff}
            className="bg-slate text-white font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Reviewing…' : 'Review ready bookings'}
          </button>
        </div>

        {error && <p className="mt-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        {created && (
          <div className="mt-5 border border-success/30 bg-success-bg rounded-lg p-4">
            <p className="font-semibold text-success text-[14px]">
              Bill run created {created.run.invoice_count} draft invoice{created.run.invoice_count === 1 ? '' : 's'} for {created.run.booking_count} booking{created.run.booking_count === 1 ? '' : 's'}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {created.invoices.map(invoice => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="bg-white border border-success/30 rounded-md px-3 py-2 text-[12.5px] font-semibold text-accent hover:underline"
                >
                  {invoice.public_id} · {formatCurrencyCents(invoice.total_amount, invoice.currency)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {readiness && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="font-semibold text-[14px]">Select vendors to invoice</p>
                <p className="text-[12px] text-ink-4 mt-0.5">
                  {readiness.booking_count} ready booking{readiness.booking_count === 1 ? '' : 's'} across {readiness.vendor_count} vendor{readiness.vendor_count === 1 ? '' : 's'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  runKey.current = null
                  const targetCurrency = selectedVendors[0]?.currency ?? readiness.vendors[0]?.currency
                  const sameCurrencyIds = readiness.vendors
                    .filter(item => item.currency === targetCurrency)
                    .map(item => item.vendor.id)
                  setSelectedVendorIds(
                    selectedVendorIds.length === sameCurrencyIds.length
                      ? []
                      : sameCurrencyIds
                  )
                }}
                className="text-[12.5px] font-semibold text-accent hover:underline"
              >
                {selectedVendorIds.length > 0 && selectedVendorIds.length === readiness.vendors.filter(item => item.currency === selectedVendors[0]?.currency).length ? 'Clear all' : 'Select all in currency'}
              </button>
            </div>

            {readiness.vendors.length === 0 ? (
              <p className="text-[13.5px] text-ink-3 py-3">No completed, priced vendor bookings are ready for this cutoff.</p>
            ) : readiness.vendors.map(item => (
              <label key={item.vendor.id} className="flex gap-3 border border-border rounded-lg p-4 cursor-pointer hover:border-ink-4">
                <input
                  type="checkbox"
                  checked={selectedVendorIds.includes(item.vendor.id)}
                  onChange={() => toggleVendor(item.vendor.id)}
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span>
                      <span className="block font-semibold text-[14px]">{item.vendor.billing_name || item.vendor.name}</span>
                      <span className="block text-[12px] text-ink-4 mt-0.5">
                        {item.vendor.billing_email || 'No billing email set'} · {item.vendor.billing_terms_days}-day terms
                      </span>
                    </span>
                      <span className="font-bold text-[14px]">{formatCurrencyCents(item.total_amount, item.currency)} <span className="text-[10px] text-ink-4">{item.currency}</span></span>
                  </span>
                  <details className="mt-2 text-[12px] text-ink-3">
                    <summary className="cursor-pointer font-medium">{item.booking_count} booking{item.booking_count === 1 ? '' : 's'}</summary>
                    <ul className="mt-2 space-y-1.5 pl-4">
                      {item.bookings.map(booking => (
                        <li key={booking.id} className="flex flex-wrap justify-between gap-2">
                          <span>{booking.public_id} · {booking.vehicle_name || 'Service'} · {booking.end_date}</span>
                          <span className="font-medium">{formatCurrencyCents(booking.total_amount, booking.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </span>
              </label>
            ))}

            {readiness.needs_attention.length > 0 && (
              <details className="border border-amber-200 bg-amber-50 rounded-lg p-4" open>
                <summary className="cursor-pointer font-semibold text-[13.5px] text-amber-900">
                  {readiness.needs_attention.length} booking{readiness.needs_attention.length === 1 ? '' : 's'} need attention and will not be billed
                </summary>
                <ul className="mt-3 space-y-2 text-[12.5px] text-amber-900">
                  {readiness.needs_attention.map(booking => (
                    <li key={`${booking.id}-${booking.reason}`} className="flex flex-wrap justify-between gap-2">
                      <span>{booking.public_id} · {booking.vendor_name}</span>
                      <span className="font-semibold">{attentionReason(booking.reason)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {readiness.vendors.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                <div>
                <p className="text-[13px] text-ink-3">
                  <strong className="text-ink">{selectedBookings}</strong> bookings ·{' '}
                  <strong className="text-ink">{formatCurrencyCents(selectedTotal, currency)}</strong> ·{' '}
                  creates <strong className="text-ink">{selectedVendors.length}</strong> draft invoice{selectedVendors.length === 1 ? '' : 's'}
                </p>
                <p className="text-[11.5px] text-ink-4 mt-1">Each bill run uses one currency. Selecting a vendor in another currency switches the selection.</p>
                </div>
                <button
                  type="button"
                  onClick={createRun}
                  disabled={creating || selectedVendorIds.length === 0}
                  className="bg-accent text-white font-semibold text-[13px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50"
                >
                  {creating ? 'Creating bill run…' : 'Create draft invoices'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
