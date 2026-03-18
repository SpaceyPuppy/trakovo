'use client'
import { useState } from 'react'

interface Note {
  id: string
  text: string
  created_at: string
}

interface Props {
  email: string
  initialNotes: Note[]
}

export default function CustomerNotes({ email, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(n => [note, ...n])
      setText('')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/admin/customers/${encodeURIComponent(email)}/notes/${id}`, { method: 'DELETE' })
    setNotes(n => n.filter(note => note.id !== id))
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h2 className="font-display font-bold text-[14px]">Internal Notes</h2>
        <p className="text-[12.5px] text-ink-3 mt-0.5">Private notes visible to admin only.</p>
      </div>

      <div className="px-6 py-5 border-b border-border">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 border border-border rounded-[6px] px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="bg-accent text-white font-semibold text-[13.5px] px-4 py-2 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap">
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </form>
      </div>

      {notes.length === 0 ? (
        <div className="px-6 py-8 text-center text-[13.5px] text-ink-4">No notes yet.</div>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map(n => (
            <li key={n.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13.5px] text-ink leading-relaxed">{n.text}</p>
                <p className="text-[11.5px] text-ink-4 mt-1">
                  {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                className="text-red-400 hover:text-red-600 text-[12px] font-medium transition-colors shrink-0">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
