'use client'
import Link from 'next/link'

const SERVICES = [
  {
    icon: '🤵',
    title: 'Chauffeured Hire',
    desc: 'Professional drivers for executive travel, airports, and special events.',
    href: '/vehicles?hire=chauffeur',
    comingSoon: false,
  },
  {
    icon: '🔑',
    title: 'Self-Drive (Dry Hire)',
    desc: 'Take the wheel on your own schedule with full day-to-day flexibility.',
    href: '/vehicles?hire=selfdrive',
    comingSoon: false,
  },
  {
    icon: '🚕',
    title: 'Taxi',
    desc: 'On-demand taxi bookings for local and regional trips.',
    href: null,
    comingSoon: true,
  },
  {
    icon: '🚗',
    title: 'Rideshare',
    desc: 'Shared ride options for cost-effective everyday travel.',
    href: null,
    comingSoon: true,
  },
  {
    icon: '🏢',
    title: 'Professional Services',
    desc: 'Tailored solutions for businesses, conferences, and group bookings.',
    href: '/services',
    comingSoon: false,
  },
]

interface Props {
  compact?: boolean
}

export default function ServicesPanel({ compact = false }: Props) {
  return (
    <div className={`w-full space-y-2.5 ${compact ? '' : 'max-w-[340px]'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-4">Our Services</p>

      {SERVICES.map(({ icon, title, desc, href, comingSoon }) => {
        const inner = (
          <>
            <span className={`flex-shrink-0 mt-0.5 ${compact ? 'text-[20px]' : 'text-[22px]'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={`font-display font-bold ${compact ? 'text-[13px]' : 'text-[14px]'} ${comingSoon ? 'text-white/50' : 'group-hover:text-white'}`}>{title}</p>
                {comingSoon ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] bg-white/10 text-white/40 px-2 py-0.5 rounded-full flex-shrink-0">Soon</span>
                ) : (
                  <span className="text-white/30 group-hover:text-white/70 transition-all text-[12px] flex-shrink-0">→</span>
                )}
              </div>
              <p className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} text-white/45 leading-[1.5]`}>{desc}</p>
            </div>
          </>
        )

        if (comingSoon) {
          return (
            <div
              key={title}
              className={`w-full text-left rounded-xl border flex items-start gap-3 text-white cursor-default ${
                compact ? 'px-4 py-3.5' : 'px-5 py-4'
              } bg-white/[0.02] border-white/[0.05] opacity-60`}
            >
              {inner}
            </div>
          )
        }

        return (
          <Link
            key={title}
            href={href!}
            className={`group w-full text-left rounded-xl transition-all border flex items-start gap-3 text-white ${
              compact ? 'px-4 py-3.5' : 'px-5 py-4'
            } bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98]`}
          >
            {inner}
          </Link>
        )
      })}

      <div className="flex flex-col gap-2 pt-2.5">
        <Link
          href="/vehicles"
          className={`bg-accent text-white font-display font-semibold text-center rounded-[6px] hover:bg-accent-dark transition-colors ${
            compact ? 'text-[13.5px] px-5 py-3' : 'text-[14px] px-5 py-3.5'
          }`}
        >
          Book Now →
        </Link>
        <Link
          href="/vehicles"
          className="bg-emerald-700 text-white font-medium text-center rounded-[6px] hover:bg-emerald-600 transition-colors px-5 py-3"
        >
          View Fleet
        </Link>
      </div>
    </div>
  )
}
