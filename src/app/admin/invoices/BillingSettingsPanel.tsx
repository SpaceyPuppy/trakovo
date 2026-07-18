'use client'

import { useState } from 'react'

interface Props {
  initialSettings: Record<string, string>
}

const inputClass = 'mt-1.5 w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/20'

export default function BillingSettingsPanel({ initialSettings }: Props) {
  const [settings, setSettings] = useState({
    billing_legal_name: initialSettings.billing_legal_name ?? '',
    billing_abn: initialSettings.billing_abn ?? '',
    billing_email: initialSettings.billing_email ?? '',
    billing_phone: initialSettings.billing_phone ?? '',
    billing_address: initialSettings.billing_address ?? '',
    billing_tax_mode: initialSettings.billing_tax_mode === 'inclusive' ? 'inclusive' : 'none',
    billing_tax_rate_bps: Number(initialSettings.billing_tax_rate_bps ?? 1000),
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/billing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? 'Could not save billing settings')
      setMessage({ type: 'success', text: 'Billing settings saved. New invoices will use this snapshot.' })
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Could not save billing settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <details className="mb-6 bg-white border border-border rounded-xl overflow-hidden">
      <summary className="cursor-pointer px-5 py-4 md:px-6 font-display font-bold text-[15px] bg-bg/40">
        Invoice identity &amp; tax settings
      </summary>
      <div className="p-5 md:p-6 border-t border-border">
        <p className="text-[12.5px] text-ink-3 mb-5">
          These values are copied onto each new invoice. Existing invoices keep their original legal and tax snapshot.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-[12.5px] font-semibold text-ink-2">
            Legal / Trading Name
            <input className={inputClass} value={settings.billing_legal_name} maxLength={191} onChange={event => setSettings(current => ({ ...current, billing_legal_name: event.target.value }))} />
          </label>
          <label className="text-[12.5px] font-semibold text-ink-2">
            ABN
            <input className={inputClass} value={settings.billing_abn} maxLength={32} onChange={event => setSettings(current => ({ ...current, billing_abn: event.target.value }))} />
          </label>
          <label className="text-[12.5px] font-semibold text-ink-2">
            Billing Email
            <input className={inputClass} type="email" value={settings.billing_email} maxLength={191} onChange={event => setSettings(current => ({ ...current, billing_email: event.target.value }))} />
          </label>
          <label className="text-[12.5px] font-semibold text-ink-2">
            Billing Phone
            <input className={inputClass} value={settings.billing_phone} maxLength={50} onChange={event => setSettings(current => ({ ...current, billing_phone: event.target.value }))} />
          </label>
          <label className="md:col-span-2 text-[12.5px] font-semibold text-ink-2">
            Billing Address
            <textarea className={inputClass} rows={3} value={settings.billing_address} maxLength={2000} onChange={event => setSettings(current => ({ ...current, billing_address: event.target.value }))} />
          </label>
          <label className="text-[12.5px] font-semibold text-ink-2">
            Tax treatment
            <select className={inputClass} value={settings.billing_tax_mode} onChange={event => setSettings(current => ({ ...current, billing_tax_mode: event.target.value }))}>
              <option value="none">No tax calculated</option>
              <option value="inclusive">GST included in booking totals</option>
            </select>
          </label>
          <label className="text-[12.5px] font-semibold text-ink-2">
            Included tax rate (%)
            <input
              className={inputClass}
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              disabled={settings.billing_tax_mode !== 'inclusive'}
              value={settings.billing_tax_rate_bps / 100}
              onChange={event => setSettings(current => ({ ...current, billing_tax_rate_bps: Math.round(Number(event.target.value) * 100) }))}
            />
          </label>
        </div>
        <p className="text-[11.5px] text-ink-4 mt-3">
          “GST included” preserves the booking total and derives the GST component; it does not add tax on top. Confirm your tax treatment with your accountant.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving} className="bg-accent text-white font-semibold text-[13px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50">
            {saving ? 'Saving…' : 'Save billing settings'}
          </button>
          {message && <p className={`text-[12.5px] ${message.type === 'success' ? 'text-success' : 'text-red-600'}`}>{message.text}</p>}
        </div>
      </div>
    </details>
  )
}
