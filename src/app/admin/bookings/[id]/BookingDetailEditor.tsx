'use client'
import { useState } from 'react'

interface Props {
  bookingId: string
  publicId: string
  vehicleName: string
  totalDays: number
  currentDailyRate: number   // dollars
  currentTotalCost: number   // dollars
  customerEmail: string
  customerName: string
}

export default function BookingDetailEditor({
  bookingId, publicId, vehicleName, totalDays,
  currentDailyRate, currentTotalCost, customerEmail, customerName,
}: Props) {
  const [rate, setRate] = useState(currentDailyRate.toFixed(2))
  const [total, setTotal] = useState(currentTotalCost.toFixed(2))
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [quoteNote, setQuoteNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function autoCalc() {
    const r = parseFloat(rate)
    if (!isNaN(r)) setTotal((r * totalDays).toFixed(2))
  }

  async function savePrice() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_rate: parseFloat(rate), total_cost: parseFloat(total) }),
      })
      if (res.ok) {
        setSaveMsg({ ok: true, text: 'Pricing saved.' })
      } else {
        const d = await res.json()
        setSaveMsg({ ok: false, text: d.error ?? 'Save failed.' })
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  async function sendQuote() {
    setSending(true)
    setSendMsg(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/send-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: quoteNote.trim() }),
      })
      if (res.ok) {
        setSendMsg({ ok: true, text: `Quote email sent to ${customerEmail}.` })
        setQuoteNote('')
      } else {
        const d = await res.json()
        setSendMsg({ ok: false, text: d.error ?? 'Send failed.' })
      }
    } catch {
      setSendMsg({ ok: false, text: 'Network error.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 bg-bg border-b border-border flex items-center justify-between">
        <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">Adjust Pricing</p>
        <p className="text-[12px] text-ink-3">{totalDays} day{totalDays !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Rate + total inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider block">
              Daily Rate ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="flex-1 border border-border rounded-[6px] px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
              />
              <button
                onClick={autoCalc}
                title={`Auto-calculate total: $${rate} × ${totalDays} days`}
                className="px-3 py-2 border border-border rounded-[6px] text-[12px] text-ink-3 hover:border-accent hover:text-accent transition-all whitespace-nowrap"
              >
                × {totalDays}d
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider block">
              Total Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={total}
              onChange={e => setTotal(e.target.value)}
              className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={savePrice}
            disabled={saving}
            className="bg-ink text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-slate transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving…' : 'Save Pricing'}
          </button>
          {saveMsg && (
            <p className={`text-[13px] font-medium ${saveMsg.ok ? 'text-success' : 'text-red-600'}`}>
              {saveMsg.ok ? '✓' : '⚠'} {saveMsg.text}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-5">
          <p className="text-[13px] font-semibold text-ink mb-1">Send Updated Quote to Customer</p>
          <p className="text-[12.5px] text-ink-3 mb-3">
            Emails <span className="font-medium text-ink">{customerName}</span> at{' '}
            <span className="font-medium text-ink">{customerEmail}</span> with the current pricing above.
            Save pricing first if you&apos;ve made changes.
          </p>
          <textarea
            rows={3}
            placeholder="Optional note to include in the email (e.g. &quot;We've adjusted your rate to reflect the agreed discount.&quot;)"
            value={quoteNote}
            onChange={e => setQuoteNote(e.target.value)}
            className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all resize-none mb-3"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={sendQuote}
              disabled={sending}
              className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? 'Sending…' : '→ Send Quote Email'}
            </button>
            {sendMsg && (
              <p className={`text-[13px] font-medium ${sendMsg.ok ? 'text-success' : 'text-red-600'}`}>
                {sendMsg.ok ? '✓' : '⚠'} {sendMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
