'use client'

import { useState } from 'react'
import type { FleetCategory } from '@/types'
import type { FleetService, ServiceCategoryAssignments } from '@/lib/service-buttons'

export default function ServiceButtonSettings({ categories, initial }: { categories: FleetCategory[]; initial: ServiceCategoryAssignments }) {
  const [assignments, setAssignments] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const buttons: { service: FleetService; label: string }[] = [
    { service: 'selfdrive', label: 'Self-Drive Buses' },
    { service: 'chauffeured', label: 'Chauffeured Hire' },
  ]

  return <form className="rounded-xl border border-border bg-white p-5 space-y-4" onSubmit={async event => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/service-categories', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignments),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to save button categories')
      setAssignments(result)
      setNotice('Button categories saved. Changes apply across the website and booking app on refresh.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save button categories') }
    finally { setSaving(false) }
  }}>
    <div>
      <h2 className="font-display font-bold text-[19px]">Service buttons</h2>
      <p className="text-[13px] text-ink-3 mt-1">Choose which category each button displays across the website and booking app. Add categories below and assign vehicles in the vehicle editor.</p>
      <p className="text-[12px] text-ink-4 mt-2">Only vehicles assigned to the selected category appear. Hire settings still control the booking options. Special Occasions and Taxi open their dedicated pages.</p>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {buttons.map(({ service, label }) => <label key={service} className="block space-y-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <select value={assignments[service]} disabled={saving} onChange={event => {
          setAssignments(current => ({ ...current, [service]: event.target.value })); setNotice('')
        }} className="w-full rounded-md border border-border bg-white px-3 py-2 text-[14px]">
          <option value="">No category — show no vehicles</option>
          {assignments[service] && !categories.some(category => category.id === assignments[service]) && <option value={assignments[service]}>Category removed — choose another</option>}
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>)}
    </div>
    {error && <p role="alert" className="text-red-700 text-[13px]">{error}</p>}
    {notice && <p role="status" className="text-success text-[13px]">{notice}</p>}
    <button disabled={saving} className="bg-ink text-white px-4 py-2 rounded-md text-[13px] font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save button categories'}</button>
  </form>
}
