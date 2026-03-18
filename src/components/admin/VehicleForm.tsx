'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { VehicleFormData, DayRate } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  initial?: Partial<VehicleFormData>
  vehicleId?: string
  publicIdDisplay?: string   // shown read-only in edit mode
  mode: 'create' | 'edit'
}

const empty: VehicleFormData = {
  name: '', description: '', price: 0, price_poa: false,
  chauffeur_price: 0, chauffeur_price_poa: false, day_rates: [],
  hire_modes: 'chauffeured_only', passengers: '', transmission: 'Automatic', fuel: 'Petrol',
  is_available: true, public_bookings_enabled: true, vendor_bookings_enabled: true, images: [],
}

export default function VehicleForm({ initial, vehicleId, publicIdDisplay, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<VehicleFormData>({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vehicle ID state (create mode only)
  const [publicId, setPublicId] = useState('')
  const [publicIdDirty, setPublicIdDirty] = useState(false)
  const [publicIdLoading, setPublicIdLoading] = useState(mode === 'create')

  useEffect(() => {
    if (mode !== 'create') return
    fetch('/api/admin/vehicles/next-id')
      .then(r => r.json())
      .then(d => { if (d.public_id) setPublicId(d.public_id) })
      .catch(() => {})
      .finally(() => setPublicIdLoading(false))
  }, [mode])

  const up = (patch: Partial<VehicleFormData>) => setForm(f => ({ ...f, ...patch }))
  const chauffeurOnly = form.hire_modes === 'chauffeured_only'

  // Day-rate helpers
  function addRate() {
    const last = form.day_rates[form.day_rates.length - 1]
    const days_from = last ? (last.days_to ?? last.days_from) + 1 : 1
    up({ day_rates: [...form.day_rates, { days_from, days_to: null, price: 0, price_poa: false, chauffeur_price: 0, chauffeur_price_poa: false }] })
  }
  function removeRate(i: number) {
    up({ day_rates: form.day_rates.filter((_, idx) => idx !== i) })
  }
  function updateRate(i: number, patch: Partial<DayRate>) {
    up({ day_rates: form.day_rates.map((r, idx) => idx === i ? { ...r, ...patch } : r) })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const payload = {
      name: form.name,
      description: form.description,
      price: chauffeurOnly ? 0 : Math.round(form.price * 100),
      is_available: form.is_available,
      public_bookings_enabled: form.public_bookings_enabled,
      vendor_bookings_enabled: form.vendor_bookings_enabled,
      images: form.images,
      // only send custom public_id if user explicitly edited it
      ...(mode === 'create' && publicIdDirty ? { public_id: publicId } : {}),
      meta: {
        hire_modes: form.hire_modes,
        passengers: form.passengers,
        transmission: form.transmission,
        fuel: form.fuel,
        chauffeur_price: Math.round(form.chauffeur_price * 100),
        price_poa: chauffeurOnly ? false : form.price_poa,
        chauffeur_price_poa: form.chauffeur_price_poa,
        day_rates: form.day_rates.map(r => ({
          ...r,
          price: chauffeurOnly ? 0 : Math.round(r.price * 100),
          chauffeur_price: Math.round(r.chauffeur_price * 100),
        })),
      },
    }
    try {
      const url = mode === 'edit' ? `/api/admin/vehicles/${vehicleId}` : '/api/admin/vehicles'
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      router.push('/admin/vehicles')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/vehicles/${vehicleId}`, { method: 'DELETE' })
      router.push('/admin/vehicles')
      router.refresh()
    } catch { setError('Delete failed') } finally { setDeleting(false) }
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-[720px]">
      {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>}

      {/* Vehicle ID */}
      <Card title="Vehicle ID">
        {mode === 'create' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
              Public ID <span className="font-normal normal-case text-ink-4">(auto-generated — edit to override)</span>
            </label>
            <input
              className={inp}
              value={publicIdLoading ? 'Loading…' : publicId}
              disabled={publicIdLoading}
              onChange={e => { setPublicId(e.target.value); setPublicIdDirty(true) }}
              placeholder="e.g. VHC-0004"
            />
            {!publicIdDirty && !publicIdLoading && (
              <p className="text-[12px] text-ink-4">Leave unchanged to use the auto-generated ID above.</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] font-semibold text-ink bg-bg border border-border rounded-[6px] px-3 py-2">
              {publicIdDisplay}
            </span>
            <p className="text-[12.5px] text-ink-4">Vehicle ID cannot be changed after creation.</p>
          </div>
        )}
      </Card>

      {/* Basic Information */}
      <Card title="Basic Information">
        <Field label="Vehicle Name" required>
          <input className={inp} required value={form.name} onChange={e => up({ name: e.target.value })} placeholder="e.g. Mercedes-Benz S-Class W223" />
        </Field>
        <Field label="Description">
          <textarea className={cn(inp, 'h-24 resize-none')} value={form.description} onChange={e => up({ description: e.target.value })} placeholder="Describe the vehicle for customers…" />
        </Field>
      </Card>

      {/* Hire Configuration */}
      <Card title="Hire Configuration">
        <Field label="Hire Modes">
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'chauffeured_only', label: 'Chauffeur Only', sub: 'Driver included, no self-drive' },
              { key: 'both', label: 'Chauffeur & Self-Drive', sub: 'Customer can choose' },
            ].map(({ key, label, sub }) => (
              <button type="button" key={key} onClick={() => up({ hire_modes: key as 'chauffeured_only' | 'both' })}
                className={cn('border-[1.5px] rounded-[6px] px-3 py-3 text-left transition-all', form.hire_modes === key ? 'border-accent bg-accent-bg' : 'border-border hover:border-ink-2 bg-white')}>
                <p className={cn('text-[13px] font-semibold', form.hire_modes === key ? 'text-accent-dark' : 'text-ink')}>{label}</p>
                <p className="text-[11.5px] text-ink-4 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </Field>

        {/* Rates */}
        <div className={cn('grid gap-4', chauffeurOnly ? 'grid-cols-1' : 'grid-cols-2')}>
          {/* Chauffeur rate — always shown */}
          <Field label="Chauffeured Daily Rate (AUD)" required>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
                  <input
                    className={cn(inp, 'pl-7', form.chauffeur_price_poa && 'opacity-40 pointer-events-none')}
                    type="number" min="0" step="1"
                    value={form.chauffeur_price_poa ? '' : (form.chauffeur_price || '')}
                    onChange={e => up({ chauffeur_price: Number(e.target.value) })}
                    placeholder={form.chauffeur_price_poa ? 'POA' : '0'}
                    disabled={form.chauffeur_price_poa}
                  />
                </div>
                <PoaToggle active={form.chauffeur_price_poa} onToggle={() => up({ chauffeur_price_poa: !form.chauffeur_price_poa })} />
              </div>
            </div>
          </Field>

          {/* Self-hire rate — only when both modes */}
          {!chauffeurOnly && (
            <Field label="Self-Drive Daily Rate (AUD)" required>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
                    <input
                      className={cn(inp, 'pl-7', form.price_poa && 'opacity-40 pointer-events-none')}
                      type="number" min="0" step="1"
                      value={form.price_poa ? '' : (form.price || '')}
                      onChange={e => up({ price: Number(e.target.value) })}
                      placeholder={form.price_poa ? 'POA' : '0'}
                      disabled={form.price_poa}
                    />
                  </div>
                  <PoaToggle active={form.price_poa} onToggle={() => up({ price_poa: !form.price_poa })} />
                </div>
              </div>
            </Field>
          )}
        </div>

        {/* Day-range rates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ink">Day-Range Rates</p>
              <p className="text-[12px] text-ink-4">Optional tiered pricing that overrides the base rate for specific day ranges.</p>
            </div>
            <button type="button" onClick={addRate}
              className="text-[12.5px] font-semibold text-accent hover:text-accent-dark border border-accent/30 hover:border-accent/60 rounded-[6px] px-3 py-1.5 transition-all">
              + Add Tier
            </button>
          </div>

          {form.day_rates.length > 0 && (
            <div className="border border-border rounded-[8px] divide-y divide-border overflow-hidden">
              {/* Header */}
              <div className={cn('grid gap-2 px-4 py-2 bg-bg', chauffeurOnly ? 'grid-cols-[80px_80px_1fr_28px]' : 'grid-cols-[80px_80px_1fr_1fr_28px]')}>
                <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">From (day)</span>
                <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">To (day)</span>
                <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">Chauffeur / day</span>
                {!chauffeurOnly && <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">Self-Drive / day</span>}
                <span />
              </div>
              {form.day_rates.map((rate, i) => (
                <div key={i} className={cn('grid gap-2 px-4 py-3 items-center bg-white', chauffeurOnly ? 'grid-cols-[80px_80px_1fr_28px]' : 'grid-cols-[80px_80px_1fr_1fr_28px]')}>
                  <input className={cn(inp, 'text-center')} type="number" min="1" step="1"
                    value={rate.days_from || ''} onChange={e => updateRate(i, { days_from: Number(e.target.value) })} placeholder="1" />
                  <input className={cn(inp, 'text-center')} type="number" min="1" step="1"
                    value={rate.days_to ?? ''} onChange={e => updateRate(i, { days_to: e.target.value === '' ? null : Number(e.target.value) })} placeholder="∞" />
                  {/* Chauffeur rate */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">$</span>
                      <input className={cn(inp, 'pl-5 text-[13px]', rate.chauffeur_price_poa && 'opacity-40 pointer-events-none')}
                        type="number" min="0" step="1"
                        value={rate.chauffeur_price_poa ? '' : (rate.chauffeur_price || '')}
                        onChange={e => updateRate(i, { chauffeur_price: Number(e.target.value) })}
                        placeholder={rate.chauffeur_price_poa ? 'POA' : '0'}
                        disabled={rate.chauffeur_price_poa} />
                    </div>
                    <PoaToggle active={rate.chauffeur_price_poa} onToggle={() => updateRate(i, { chauffeur_price_poa: !rate.chauffeur_price_poa })} />
                  </div>
                  {/* Self-drive rate */}
                  {!chauffeurOnly && (
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">$</span>
                        <input className={cn(inp, 'pl-5 text-[13px]', rate.price_poa && 'opacity-40 pointer-events-none')}
                          type="number" min="0" step="1"
                          value={rate.price_poa ? '' : (rate.price || '')}
                          onChange={e => updateRate(i, { price: Number(e.target.value) })}
                          placeholder={rate.price_poa ? 'POA' : '0'}
                          disabled={rate.price_poa} />
                      </div>
                      <PoaToggle active={rate.price_poa} onToggle={() => updateRate(i, { price_poa: !rate.price_poa })} />
                    </div>
                  )}
                  <button type="button" onClick={() => removeRate(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-[4px] text-ink-4 hover:text-red-600 hover:bg-red-50 transition-all text-[15px] font-bold">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Specifications */}
      <Card title="Specifications">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Passengers">
            <input className={inp} value={form.passengers} onChange={e => up({ passengers: e.target.value })} placeholder="e.g. 4" />
          </Field>
          <Field label="Transmission">
            <select className={inp} value={form.transmission} onChange={e => up({ transmission: e.target.value })}>
              {['Automatic','Manual','PDK Auto','CVT'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Fuel">
            <select className={inp} value={form.fuel} onChange={e => up({ fuel: e.target.value })}>
              {['Petrol','Diesel','Electric','Hybrid','PHEV'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* Images */}
      <Card title="Images">
        <Field label="Image URLs">
          <textarea
            className={cn(inp, 'h-28 resize-none font-mono text-[12.5px]')}
            value={form.images.join('\n')}
            onChange={e => up({ images: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
          />
        </Field>
        <p className="text-[12px] text-ink-4">One URL per line. Accepts any public HTTPS image URL.</p>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {form.images.filter(u => u.startsWith('http')).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-16 h-12 object-cover rounded-[4px] border border-border bg-bg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ))}
          </div>
        )}
      </Card>

      {/* Availability */}
      <Card title="Availability & Visibility">
        <div className="space-y-3">
          <Toggle
            on={form.is_available}
            onToggle={() => up({ is_available: !form.is_available })}
            label="Vehicle is active"
            sub="Master switch — when off, vehicle is hidden everywhere regardless of other settings."
          />
          <div className={cn('pl-4 border-l-2 border-border space-y-3 transition-opacity', !form.is_available && 'opacity-40 pointer-events-none')}>
            <Toggle
              on={form.public_bookings_enabled}
              onToggle={() => up({ public_bookings_enabled: !form.public_bookings_enabled })}
              label="Visible on public site"
              sub="Show this vehicle on the public fleet page and allow direct online bookings."
            />
            <Toggle
              on={form.vendor_bookings_enabled}
              onToggle={() => up({ vendor_bookings_enabled: !form.vendor_bookings_enabled })}
              label="Available to vendors"
              sub="Allow assigned vendors to see and book this vehicle via their portal."
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-accent text-white font-display font-bold text-[14px] px-7 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? <><span className="spinner" /> Saving…</> : mode === 'edit' ? 'Save Changes' : 'Create Vehicle'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-border text-ink-3 font-medium text-[14px] px-5 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all">
          Cancel
        </button>
        {mode === 'edit' && vehicleId && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="ml-auto border border-red-200 text-red-600 font-medium text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-red-50 transition-all disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete Vehicle'}
          </button>
        )}
      </div>
    </form>
  )
}

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

function PoaToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn(
        'flex-shrink-0 text-[11px] font-bold px-2 py-1.5 rounded-[5px] border transition-all whitespace-nowrap',
        active
          ? 'bg-amber-50 border-amber-300 text-amber-700'
          : 'bg-white border-border text-ink-4 hover:border-ink-3 hover:text-ink-2'
      )}>
      POA
    </button>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">{title}</h3>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div onClick={onToggle}
        className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5', on ? 'bg-success' : 'bg-border-2')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </div>
      <div>
        <p className="text-[14px] font-medium leading-snug">{label}</p>
        {sub && <p className="text-[12px] text-ink-4 mt-0.5">{sub}</p>}
      </div>
    </label>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
