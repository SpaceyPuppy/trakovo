'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Message = {
  id: string; subject: string; message: string; status: string
  staff_reply: string | null; created_at: string
}

export default function DriverMessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/driver/messages')
    if (res.status === 401) { router.push('/driver/login'); return }
    if (res.ok) setMessages(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    const res = await fetch('/api/driver/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to send')
    } else {
      setSubject('')
      setMessage('')
      await load()
    }
    setSending(false)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Messages</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Send a message to the team or view replies.</p>
      </div>

      {/* Compose */}
      <div className="bg-white border border-border rounded-xl p-6 mb-6">
        <h2 className="font-display font-semibold text-[16px] mb-4">New Message</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Subject</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink-2 mb-1">Message</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full border border-border rounded-[6px] px-3 py-2 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              required
            />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button type="submit" disabled={sending}
            className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* Message list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-[13.5px] text-ink-4">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="bg-white border border-border rounded-xl px-6 py-10 text-center text-[13.5px] text-ink-4">
            No messages yet.
          </div>
        ) : messages.map(m => (
          <div key={m.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-bg/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-[14px]">{m.subject}</p>
                <p className="text-[12px] text-ink-4 mt-0.5">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${m.status === 'open' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-success-bg text-success border-success/30'}`}>
                  {m.status}
                </span>
                <span className="text-ink-4 text-[12px]">{expanded === m.id ? '▲' : '▼'}</span>
              </div>
            </button>
            {expanded === m.id && (
              <div className="px-5 pb-5 border-t border-border">
                <p className="text-[13.5px] text-ink whitespace-pre-wrap pt-4">{m.message}</p>
                {m.staff_reply && (
                  <div className="mt-4 bg-accent-bg border border-accent/20 rounded-[6px] px-4 py-3">
                    <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">Team Reply</p>
                    <p className="text-[13.5px] text-ink whitespace-pre-wrap">{m.staff_reply}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
