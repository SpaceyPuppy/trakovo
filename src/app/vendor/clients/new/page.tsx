'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/vendor/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
      router.push(`/vendor/clients/${data.client.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:border-accent bg-white'
  const lbl = 'block text-[12px] font-semibold text-ink-3 mb-1'

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link href="/vendor/clients" className="text-[13px] text-ink-3 hover:text-accent transition-colors">← Clients</Link>
        <h1 className="font-display font-bold text-[26px] tracking-tight mt-2">Add Client</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Add a client to your account for quick booking.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className={lbl}>Full name *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            className={inp} placeholder="e.g. John Smith" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className={inp} placeholder="optional" />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              className={inp} placeholder="optional" />
          </div>
        </div>
        <div>
          <label className={lbl}>Reference / Claim no.</label>
          <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)}
            className={inp} placeholder="e.g. DVA-12345" />
        </div>
        <div>
          <label className={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} className={inp} placeholder="Any additional notes…" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-[6px]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/vendor/clients"
            className="text-[13.5px] font-semibold text-ink-3 hover:text-ink transition-colors px-4 py-2.5">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="bg-accent text-white font-semibold text-[13.5px] px-6 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  )
}
