'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export default function NewDriverPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to create driver')
      setSaving(false)
    } else {
      const d = await res.json()
      router.push(`/admin/drivers/${d.id}`)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30'

  return (
    <div className="px-10 py-10 max-w-xl">
      <Link href="/admin/drivers" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7">
        ← Back to Drivers
      </Link>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-8">Add Driver</h1>

      <div className="bg-white border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Full Name</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Smith" required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Username</label>
            <input className={inp} value={form.username} onChange={e => set('username', e.target.value)} placeholder="e.g. jsmith" required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Password</label>
            <input className={inp} type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Email <span className="text-ink-4 font-normal">(optional)</span></label>
            <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Phone <span className="text-ink-4 font-normal">(optional)</span></label>
            <input className={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Driver'}
          </button>
        </form>
      </div>
    </div>
  )
}
