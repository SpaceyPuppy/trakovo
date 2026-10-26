'use client'

import { useState } from 'react'
import type { FleetCategory } from '@/types'

const inputClass = 'w-full rounded-md border border-border bg-white px-3 py-2 text-[14px]'
const groups = [
  { value: '', label: 'No homepage group' }, { value: 'buses', label: 'Buses' },
  { value: 'chauffeured', label: 'Chauffeured Vehicles' }, { value: 'special-occasions', label: 'Special Occasion Vehicles' },
]

function CategoryEditor({ category, busy, onSave, onDelete }: {
  category?: FleetCategory
  busy: boolean
  onSave: (name: string, group: string) => Promise<boolean>
  onDelete?: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [group, setGroup] = useState<string>(category?.homepage_group ?? '')
  const key = category?.id ?? 'new'
  return <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-xl border border-border bg-white p-5" onSubmit={async event => {
    event.preventDefault()
    if (await onSave(name, group) && !category) { setName(''); setGroup('') }
  }}>
    <div><label htmlFor={`category-name-${key}`} className="block text-[12px] font-semibold mb-2">Category name</label><input id={`category-name-${key}`} required maxLength={80} value={name} onChange={event => setName(event.target.value)} className={inputClass} placeholder="e.g. Bus" /></div>
    <div><label htmlFor={`category-group-${key}`} className="block text-[12px] font-semibold mb-2">Homepage group</label><select id={`category-group-${key}`} value={group} onChange={event => setGroup(event.target.value)} className={inputClass}>{groups.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    <div className="flex gap-3 items-center"><button disabled={busy} className="bg-ink text-white px-4 py-2 rounded-md text-[13px] font-semibold disabled:opacity-50">{category ? 'Save' : 'Add Category'}</button>{onDelete && <button type="button" disabled={busy} onClick={onDelete} className="text-red-600 text-[13px] disabled:opacity-50">Remove</button>}</div>
  </form>
}

export default function CategoryManager({ initialCategories }: { initialCategories: FleetCategory[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function change(method: 'POST' | 'PUT' | 'DELETE', category?: FleetCategory, name?: string, group?: string): Promise<boolean> {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/admin/vehicle-categories${category ? `/${encodeURIComponent(category.id)}` : ''}`, {
        method, headers: { 'Content-Type': 'application/json' },
        ...(method !== 'DELETE' && { body: JSON.stringify({ name, homepage_group: group }) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to update categories')
      setCategories(current => method === 'DELETE' ? current.filter(item => item.id !== category!.id)
        : [...current.filter(item => item.id !== result.id), result].sort((a, b) => a.name.localeCompare(b.name)))
      setNotice(method === 'DELETE' ? 'Category removed. Vehicles remain in the fleet.' : 'Category saved.')
      return true
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update categories'); return false }
    finally { setBusy(false) }
  }

  return <div className="space-y-4">
    {error && <p role="alert" className="text-red-700 text-[14px]">{error}</p>}
    {notice && <p role="status" className="text-success text-[14px]">{notice}</p>}
    {categories.map(category => <CategoryEditor key={category.id} category={category} busy={busy} onSave={(name, group) => change('PUT', category, name, group)} onDelete={() => {
      if (window.confirm(`Remove “${category.name}” from your fleet categories? Vehicles will remain in the fleet.`)) void change('DELETE', category)
    }} />)}
    <h2 className="font-display font-bold text-[19px] pt-5">Add a category</h2>
    <CategoryEditor busy={busy} onSave={(name, group) => change('POST', undefined, name, group)} />
  </div>
}
