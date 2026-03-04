'use client'
import { useState } from 'react'

interface Note {
  id: string
  text: string
  author: string
  created_at: string
}

interface Props {
  bookingId: string
  initialNotes: Note[]
}

export default function BookingNotes({ bookingId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function addNote() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(n => [...n, note])
        setText('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(noteId: string) {
    setDeletingId(noteId)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) setNotes(n => n.filter(x => x.id !== noteId))
    } finally {
      setDeletingId(null)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <section className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 bg-bg border-b border-border">
        <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider">
          Internal Notes <span className="font-normal text-ink-4 normal-case tracking-normal ml-1">— visible to staff only</span>
        </p>
      </div>
      <div className="px-5 py-5 space-y-4">
        {/* Existing notes */}
        {notes.length === 0 ? (
          <p className="text-[13px] text-ink-4 italic">No notes yet. Add the first one below.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map(note => (
              <li key={note.id} className="flex gap-3 group">
                <div className="w-7 h-7 rounded-full bg-slate flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">
                  {note.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-ink">{note.author}</span>
                    <span className="text-[11px] text-ink-4 flex-shrink-0">{formatTime(note.created_at)}</span>
                  </div>
                  <p className="text-[13.5px] text-ink-2 leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  disabled={deletingId === note.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-4 hover:text-red-500 text-[12px] flex-shrink-0 mt-1 disabled:opacity-30"
                  title="Delete note"
                >
                  {deletingId === note.id ? '…' : '✕'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add note */}
        <div className="border-t border-border pt-4">
          <textarea
            rows={3}
            placeholder="Add an internal note... (e.g. 'Customer called to confirm pickup location', 'Negotiated rate to $350/day')"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
            className="w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all resize-none mb-2.5"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-4">Ctrl+Enter to save</span>
            <button
              onClick={addNote}
              disabled={!text.trim() || saving}
              className="bg-ink text-white font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:bg-slate transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
