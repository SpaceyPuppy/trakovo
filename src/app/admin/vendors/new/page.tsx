'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all'

export default function NewVendorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    contact_email: '',
    contact_phone: '',
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed to create vendor')
      router.push(`/admin/vendors/${d.vendor.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-10 py-10 max-w-[560px]">
      <div className="mb-8">
        <Link href="/admin/vendors" className="text-[13px] text-ink-3 hover:text-ink mb-3 inline-block">← Back to Vendors</Link>
        <h1 className="font-display font-bold text-[26px] tracking-tight">New Vendor</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Create a B2B partner account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h3 className="font-display font-bold text-[14px]">Organisation Details</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-[13px] rounded-[6px] px-3 py-2 text-red-600 bg-red-50 border border-red-200">{error}</p>}
          <div>
            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Organisation Name *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. DVA, Ambulance Victoria" required />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Username *</label>
            <input className={inp} value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="e.g. dva-bookings" required />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Initial Password *</label>
            <input className={inp} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Contact Email</label>
            <input className={inp} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="For notifications" />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Contact Phone</label>
            <input className={inp} type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-6 py-2.5 rounded-[6px] transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Vendor'}
            </button>
            <Link href="/admin/vendors" className="text-[13px] text-ink-3 hover:text-ink">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  )
}
