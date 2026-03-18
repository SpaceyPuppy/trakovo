'use client'
import { useState } from 'react'
import Link from 'next/link'

const SERVICES = [
  { icon: '🤵', title: 'Chauffeured Hire', desc: 'Professional drivers for executive travel, airports, and special events.' },
  { icon: '🔑', title: 'Self-Drive (Dry Hire)', desc: 'Take the wheel on your own schedule with full day-to-day flexibility.' },
  { icon: '🏢', title: 'Corporate & Events', desc: 'Tailored solutions for businesses, conferences, and group bookings.' },
]

interface Props {
  /** Compact layout used in the 25%-wide hero panel */
  compact?: boolean
}

export default function ServicesPanel({ compact = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const sel = SERVICES.find(s => s.title === selected)

  return (
    <div className={`w-full space-y-2.5 ${compact ? '' : 'max-w-[340px]'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-4">Our Services</p>

      {SERVICES.map(({ icon, title, desc }) => {
        const active = selected === title
        return (
          <button
            key={title}
            type="button"
            onClick={() => setSelected(active ? null : title)}
            className={`w-full text-left rounded-xl transition-all border group ${
              compact ? 'px-4 py-3.5' : 'px-5 py-4'
            } ${
              active
                ? 'bg-white/[0.11] border-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20'
            }`}
          >
            <div className={`flex items-start gap-${compact ? '3' : '3.5'}`}>
              <span className={`flex-shrink-0 mt-0.5 ${compact ? 'text-[20px]' : 'text-[22px]'}`}>{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`font-display font-bold ${compact ? 'text-[13px]' : 'text-[14px]'} text-white`}>{title}</p>
                  <span className={`text-[13px] transition-all flex-shrink-0 ${active ? 'text-white opacity-100' : 'opacity-0'}`}>✓</span>
                </div>
                <p className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} text-white/45 leading-[1.5]`}>{desc}</p>
              </div>
            </div>
          </button>
        )
      })}

      <div className="flex flex-col gap-2 pt-2.5">
        <Link
          href="/vehicles"
          className={`font-display font-semibold text-center rounded-[6px] transition-all ${
            compact ? 'text-[13.5px] px-5 py-3' : 'text-[14px] px-5 py-3.5'
          } ${
            selected
              ? 'bg-accent text-white hover:bg-accent-dark shadow-[0_0_0_3px_rgba(255,255,255,0.18)] scale-[1.01]'
              : 'bg-accent text-white hover:bg-accent-dark'
          }`}
        >
          {sel ? `Book ${sel.title} →` : 'Book Now →'}
        </Link>
        <Link
          href="/vehicles"
          className="border border-white/20 text-white/75 font-medium text-center rounded-[6px] hover:border-white/50 hover:text-white transition-all px-5 py-3"
        >
          View Fleet
        </Link>
      </div>
    </div>
  )
}
