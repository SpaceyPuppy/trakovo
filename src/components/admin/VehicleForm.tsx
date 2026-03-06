'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Vehicle, VehicleFormData } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  initial?: Partial<VehicleFormData>
  vehicleId?: string
  mode: 'create' | 'edit'
}

const empty: VehicleFormData = {
  name: '', description: '', price: 0, chauffeur_price: 0,
  hire_modes: 'chauffeured_only', passengers: '', transmission: 'Automatic', fuel: 'Petrol',
  is_available: true, images: [],
}

export default function VehicleForm({ initial, vehicleId, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<VehicleFormData>({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const up = (patch: Partial<VehicleFormData>) => setForm(f => ({ ...f, ...patch }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const payload = {
      name: form.name, description: form.description,
      price: Math.round(form.price * 100),   // store in cents
      is_available: form.is_available,
      images: form.images,
      meta: {
        hire_modes: form.hire_modes,
        passengers: form.passengers,
        transmission: form.transmission,
        fuel: form.fuel,
        chauffeur_price: Math.round(form.chauffeur_price * 100),
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

      <Card title="Basic Information">
        <Field label="Vehicle Name" required>
          <input className={inp} required value={form.name} onChange={e => up({ name: e.target.value })} placeholder="e.g. Mercedes-Benz S-Class W223" />
        </Field>
        <Field label="Description">
          <textarea className={cn(inp, 'h-24 resize-none')} value={form.description} onChange={e => up({ description: e.target.value })} placeholder="Describe the vehicle for customers…" />
        </Field>
      </Card>

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
        <div className={cn('grid gap-4', form.hire_modes === 'both' ? 'grid-cols-2' : 'grid-cols-1 max-w-[50%]')}>
          {form.hire_modes === 'both' && (
            <Field label="Self-Drive Daily Rate (AUD)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
                <input className={cn(inp, 'pl-7')} type="number" min="0" step="1" required value={form.price || ''} onChange={e => up({ price: Number(e.target.value) })} placeholder="0" />
              </div>
            </Field>
          )}
          <Field label="Chauffeured Daily Rate (AUD)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px]">$</span>
              <input className={cn(inp, 'pl-7')} type="number" min="0" step="1" required value={form.chauffeur_price || ''} onChange={e => up({ chauffeur_price: Number(e.target.value) })} placeholder="0" />
            </div>
          </Field>
        </div>
      </Card>

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

      <Card title="Availability">
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => up({ is_available: !form.is_available })}
            className={cn('w-10 h-6 rounded-full transition-colors relative', form.is_available ? 'bg-success' : 'bg-border-2')}>
            <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', form.is_available ? 'left-[18px]' : 'left-0.5')} />
          </div>
          <span className="text-[14px] font-medium">{form.is_available ? 'Available for booking' : 'Not available'}</span>
        </label>
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
