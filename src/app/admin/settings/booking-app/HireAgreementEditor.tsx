'use client'
import { useState } from 'react'

export interface Clause {
  title: string
  body: string
}

const inp = 'w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

export default function HireAgreementEditor({ initial }: { initial: Clause[] }) {
  const [clauses, setClauses] = useState<Clause[]>(initial)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  function update(i: number, field: keyof Clause, value: string) {
    setClauses(c => c.map((clause, idx) => idx === i ? { ...clause, [field]: value } : clause))
  }

  function addClause() {
    setClauses(c => [...c, { title: `${c.length + 1}. New Clause`, body: '' }])
  }

  function removeClause(i: number) {
    if (!confirm('Remove this clause?')) return
    setClauses(c => c.filter((_, idx) => idx !== i))
  }

  function moveUp(i: number) {
    if (i === 0) return
    setClauses(c => { const a = [...c]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })
  }

  function moveDown(i: number) {
    setClauses(c => { if (i === c.length - 1) return c; const a = [...c]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hire_agreement: JSON.stringify(clauses) }),
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-3">
      {clauses.map((clause, i) => (
        <div key={i} className="border border-border rounded-[8px] p-4 space-y-2 bg-bg/40">
          <div className="flex items-center gap-2">
            <input
              className={inp + ' flex-1'}
              value={clause.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder="Clause title"
            />
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center text-ink-4 hover:text-ink disabled:opacity-30 transition-colors text-[13px]">↑</button>
              <button onClick={() => moveDown(i)} disabled={i === clauses.length - 1} className="w-7 h-7 flex items-center justify-center text-ink-4 hover:text-ink disabled:opacity-30 transition-colors text-[13px]">↓</button>
              <button onClick={() => removeClause(i)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors text-[13px]">✕</button>
            </div>
          </div>
          <textarea
            className={inp + ' resize-y min-h-[80px]'}
            value={clause.body}
            onChange={e => update(i, 'body', e.target.value)}
            placeholder="Clause body text…"
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={addClause}
          className="text-[13px] font-semibold text-accent hover:text-accent-dark transition-colors">
          + Add Clause
        </button>
        <div className="flex items-center gap-3">
          {success && <span className="text-[13px] text-success">Saved ✓</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-accent text-white font-display font-bold text-[13.5px] px-5 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Agreement'}
          </button>
        </div>
      </div>
    </div>
  )
}
