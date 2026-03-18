'use client'
import type { Clause } from '@/lib/hire-agreement-defaults'

interface Props {
  open: boolean
  onAccept: () => void
  onClose: () => void
  clauses: Clause[]
}

export default function HireAgreementModal({ open, onAccept, onClose, clauses }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 animate-fade-up">
      <div className="bg-white rounded-xl w-[520px] max-w-[94vw] max-h-[82vh] flex flex-col shadow-card-lg">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-[18px]">Vehicle Hire Agreement</span>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-bg hover:text-ink transition-all text-base">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 text-[13.5px] text-ink-2 leading-relaxed space-y-4">
          {clauses.map((clause) => (
            <div key={clause.title}>
              <h4 className="font-display font-bold text-[14px] text-ink mb-1">{clause.title}</h4>
              <p>{clause.body}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2.5 justify-end">
          <button onClick={onClose} className="border border-border rounded-[6px] px-4 py-2 text-[13px] text-ink-3 hover:border-ink-3 hover:text-ink transition-all">Cancel</button>
          <button onClick={onAccept} className="bg-success text-white rounded-[6px] px-5 py-2 text-[13px] font-bold hover:bg-[#155235] transition-colors">✓ I Accept This Agreement</button>
        </div>
      </div>
    </div>
  )
}
