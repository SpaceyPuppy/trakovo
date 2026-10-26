'use client'
import Link from 'next/link'
import TaxiBookingLink from '@/components/book/TaxiBookingLink'
import type { TaxiBookingConfig } from '@/lib/taxi-booking-config'
import { SERVICE_BUTTONS } from '@/lib/service-buttons'

interface Props {
  compact?: boolean
  taxiConfig: TaxiBookingConfig
}

export default function ServicesPanel({ compact = false, taxiConfig }: Props) {
  return (
    <div className={`w-full space-y-2.5 ${compact ? '' : 'max-w-[340px]'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-4">Our Services</p>

      {SERVICE_BUTTONS.map(({ icon, title, description, href }) => {
        const inner = (
          <>
            <span className={`flex-shrink-0 mt-0.5 ${compact ? 'text-[20px]' : 'text-[22px]'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={`font-display font-bold ${compact ? 'text-[13px]' : 'text-[14px]'} group-hover:text-white`}>{title}</p>
                <span className="text-white/30 group-hover:text-white/70 transition-all text-[12px] flex-shrink-0">→</span>
              </div>
              <p className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} text-white/45 leading-[1.5]`}>{description}</p>
            </div>
          </>
        )

        const className = `group w-full text-left rounded-xl transition-all border flex items-start gap-3 text-white ${
          compact ? 'px-4 py-3.5' : 'px-5 py-4'
        } bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98]`

        if (href === '/book/taxi') return (
          <TaxiBookingLink key={title} config={taxiConfig} className={className}>{inner}</TaxiBookingLink>
        )

        return (
          <Link
            key={title}
            href={href}
            className={className}
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
