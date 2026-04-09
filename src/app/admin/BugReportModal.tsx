'use client'
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function BugReportModal({ open, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ issueUrl: string; issueNumber: number } | null>(null)
  const [error, setError] = useState('')

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setResult(null)
      setError('')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Failed to submit report'); return }
      setResult({ issueUrl: d.issue_url, issueNumber: d.issue_number })
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">🐛</span>
              <h2 className="font-display font-bold text-[16px]">Report a Bug</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-ink-4 hover:text-ink hover:bg-bg rounded-[6px] transition-colors"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          {result ? (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 bg-success-bg border border-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-display font-bold text-[16px] mb-1">Bug report submitted</p>
              <p className="text-[13.5px] text-ink-3 mb-5">
                Issue #{result.issueNumber} has been created on GitHub.
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={result.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13.5px] font-semibold text-accent hover:underline"
                >
                  View on GitHub →
                </a>
                <span className="text-ink-4">·</span>
                <button onClick={onClose} className="text-[13.5px] text-ink-3 hover:text-ink">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                  Title <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short summary of the issue"
                  className={inp}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                  Description <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What happened? What did you expect to happen? Steps to reproduce if known."
                  rows={5}
                  className={`${inp} resize-none`}
                  required
                />
              </div>

              <div className="bg-bg border border-border rounded-[6px] px-3 py-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-1.5">Captured automatically</p>
                <p className="text-[12px] text-ink-3 font-mono truncate">📍 {typeof window !== 'undefined' ? window.location.pathname : '—'}</p>
                <p className="text-[12px] text-ink-3 font-mono truncate">🖥 {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '—'}</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-2.5 rounded-[6px]">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[13.5px] text-ink-3 hover:text-ink px-4 py-2 rounded-[6px] hover:bg-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
