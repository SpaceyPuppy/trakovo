'use client'

interface Props {
  open: boolean
  onAccept: () => void
  onClose: () => void
}

export default function HireAgreementModal({ open, onAccept, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 animate-fade-up">
      <div className="bg-white rounded-xl w-[520px] max-w-[94vw] max-h-[82vh] flex flex-col shadow-card-lg">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-[18px]">Vehicle Hire Agreement</span>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-bg hover:text-ink transition-all text-base">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 text-[13.5px] text-ink-2 leading-relaxed space-y-4">
          {[
            ['1. Hirer Requirements', 'The Hirer must hold a current and valid Australian driver\'s licence appropriate for the class of vehicle. The Hirer must be at least 21 years of age and present valid photo ID at the time of vehicle collection.'],
            ['2. Authorised Drivers', 'The vehicle may only be driven by the nominated Hirer. Any additional drivers must be declared in advance and approved in writing by the operator.'],
            ['3. Permitted Use', 'The vehicle must not be used for any unlawful purpose, racing, off-road driving, driver instruction, or to carry more passengers than the vehicle is rated for.'],
            ['4. Damage & Excess', 'The Hirer is responsible for all damage occurring during the hire period. A damage excess of $2,500 applies per incident.'],
            ['5. Fuel', 'Vehicles are provided with a full tank and must be returned full. A refuelling fee of $2.50/L plus a $40 admin fee applies if returned below full.'],
            ['6. Late Returns', 'The vehicle must be returned by the agreed date and time. Late returns are charged at the full daily rate per day or part thereof.'],
            ['7. Cancellation', 'Cancellations more than 48 hours prior to hire start receive a full refund. Cancellations within 48 hours forfeit the deposit.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h4 className="font-display font-bold text-[14px] text-ink mb-1">{title}</h4>
              <p>{body}</p>
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
