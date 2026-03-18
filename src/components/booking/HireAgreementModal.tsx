'use client'
import { useEffect, useRef, useState } from 'react'
import type { Clause } from '@/lib/hire-agreement-defaults'

interface Props {
  open: boolean
  onAccept: () => void
  onClose: () => void
  clauses: Clause[]
}

export default function HireAgreementModal({ open, onAccept, onClose, clauses }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canAccept, setCanAccept] = useState(false)

  // Reset scroll-to-bottom state each time modal opens, then check immediately
  // (handles short agreements that don't require scrolling)
  useEffect(() => {
    if (!open) return
    setCanAccept(false)
    // Give DOM time to render before measuring
    requestAnimationFrame(() => {
      checkScrolled()
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function checkScrolled() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 16
    if (atBottom) setCanAccept(true)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 animate-fade-up p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl w-full max-w-[520px] flex flex-col shadow-card-lg"
        style={{ maxHeight: 'calc(100dvh - 24px)' }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <span className="font-display font-bold text-[17px]">Vehicle Hire Agreement</span>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-bg hover:text-ink transition-all text-base">✕</button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={checkScrolled}
          className="px-5 py-5 overflow-y-auto flex-1 text-[13.5px] text-ink-2 leading-relaxed space-y-4"
        >
          {clauses.map((clause) => (
            <div key={clause.title}>
              <h4 className="font-display font-bold text-[14px] text-ink mb-1">{clause.title}</h4>
              <p>{clause.body}</p>
            </div>
          ))}
          {/* Bottom sentinel — gives padding and ensures the last clause isn't hidden behind the footer */}
          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          {!canAccept && (
            <p className="text-[11.5px] text-ink-4 text-center mb-2.5">Scroll to the bottom to accept</p>
          )}
          <div className="flex gap-2.5 justify-end">
            <button
              onClick={onClose}
              className="border border-border rounded-[6px] px-4 py-2 text-[13px] text-ink-3 hover:border-ink-3 hover:text-ink transition-all"
            >
              Cancel
            </button>
            <button
              onClick={canAccept ? onAccept : undefined}
              disabled={!canAccept}
              className={`rounded-[6px] px-5 py-2 text-[13px] font-bold transition-colors ${
                canAccept
                  ? 'bg-success text-white hover:bg-[#155235]'
                  : 'bg-bg text-ink-4 border border-border cursor-not-allowed'
              }`}
            >
              {canAccept ? '✓ I Accept This Agreement' : '↓ Scroll to bottom to accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
