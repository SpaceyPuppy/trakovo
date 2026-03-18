'use client'
import { useState } from 'react'
import BookingPanel from '@/components/booking/BookingPanel'
import type { Vehicle, AvailabilityRange } from '@/types'
import type { Clause } from '@/lib/hire-agreement-defaults'
import { formatCurrency, getVehicleImage, cn } from '@/lib/utils'

interface Props {
  vehicle: Vehicle
  availability: AvailabilityRange[]
  hireAgreementClauses: Clause[]
}

export default function VehiclePageContent({ vehicle, availability, hireAgreementClauses }: Props) {
  const isDual = vehicle.meta.hire_modes === 'both'
  const img = getVehicleImage(vehicle)

  const [hireType, setHireType] = useState<'chauffeured' | 'dry-hire'>(
    isDual ? 'chauffeured' : 'chauffeured'
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
      {/* Left column */}
      <div>
        {/* Hero image */}
        <div className="w-full aspect-video bg-gradient-to-br from-slate to-slate-2 rounded-xl mb-7 relative overflow-hidden flex items-center justify-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={vehicle.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="text-[100px] opacity-30">🚗</span>
          )}
          <div className="absolute bottom-5 left-5 bg-black/45 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2.5 text-white">
            <p className="font-display font-bold text-[16px]">{vehicle.name}</p>
            <p className="text-[12px] text-white/60 mt-0.5">
              {vehicle.category?.name ?? 'Vehicle'} · From{' '}
              {(() => {
                const poa = isDual ? vehicle.price_poa : vehicle.chauffeur_price_poa
                const basePrice = isDual ? vehicle.price : vehicle.chauffeur_price
                return poa ? 'POA' : `${formatCurrency(basePrice)}/day`
              })()}
            </p>
          </div>
        </div>

        {vehicle.category && (
          <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.1em] mb-2">{vehicle.category.name}</p>
        )}
        <h1 className="font-display font-extrabold text-[clamp(24px,3vw,34px)] tracking-tight mb-4">{vehicle.name}</h1>
        {vehicle.description && (
          <p className="text-[15px] text-ink-2 leading-[1.75] font-light mb-7">{vehicle.description}</p>
        )}

        {/* Specs */}
        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden mb-7">
          {[
            ['Passengers', vehicle.meta.passengers],
            ['Transmission', vehicle.meta.transmission],
            ['Fuel', vehicle.meta.fuel],
            ['Licence Required', vehicle.meta.licence_category],
          ].filter(([, v]) => !!v).map(([label, val]) => (
            <div key={label} className="bg-white px-4 py-4">
              <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-1">{label}</p>
              <p className="font-display font-bold text-[16px]">{val}</p>
            </div>
          ))}
        </div>

        {/* Pricing tiles — clickable buttons for dual-mode vehicles */}
        <div className="flex gap-4 flex-wrap">
          {isDual ? (
            <>
              <button
                onClick={() => setHireType('dry-hire')}
                className={cn(
                  'flex-1 min-w-[140px] border rounded-[6px] px-4 py-3.5 text-left transition-all',
                  hireType === 'dry-hire'
                    ? 'bg-slate border-slate ring-2 ring-slate ring-offset-2'
                    : 'bg-white border-border hover:border-ink-2'
                )}
              >
                <p className={cn('text-[11px] font-semibold uppercase tracking-wider mb-1', hireType === 'dry-hire' ? 'text-white/50' : 'text-ink-4')}>Self-Drive</p>
                {vehicle.price_poa ? (
                  <p className={cn('font-display font-extrabold text-[24px] tracking-tight', hireType === 'dry-hire' ? 'text-amber-400' : 'text-amber-600')}>POA</p>
                ) : (
                  <p className={cn('font-display font-extrabold text-[24px] tracking-tight', hireType === 'dry-hire' ? 'text-white' : 'text-ink')}>{formatCurrency(vehicle.price)}</p>
                )}
                <p className={cn('text-[12px] mt-0.5', hireType === 'dry-hire' ? 'text-white/40' : 'text-ink-4')}>per day</p>
                {hireType === 'dry-hire' && (
                  <p className="text-[11px] font-bold text-white/70 mt-1.5 uppercase tracking-wide">Selected ✓</p>
                )}
              </button>

              <button
                onClick={() => setHireType('chauffeured')}
                className={cn(
                  'flex-1 min-w-[140px] border rounded-[6px] px-4 py-3.5 text-left transition-all',
                  hireType === 'chauffeured'
                    ? 'bg-slate border-slate ring-2 ring-slate ring-offset-2'
                    : 'bg-white border-border hover:border-ink-2'
                )}
              >
                <p className={cn('text-[11px] font-semibold uppercase tracking-wider mb-1', hireType === 'chauffeured' ? 'text-white/50' : 'text-ink-4')}>Chauffeured</p>
                {vehicle.chauffeur_price_poa ? (
                  <p className={cn('font-display font-extrabold text-[24px] tracking-tight', hireType === 'chauffeured' ? 'text-amber-400' : 'text-amber-600')}>POA</p>
                ) : (
                  <p className={cn('font-display font-extrabold text-[24px] tracking-tight', hireType === 'chauffeured' ? 'text-white' : 'text-ink')}>{formatCurrency(vehicle.chauffeur_price)}</p>
                )}
                <p className={cn('text-[12px] mt-0.5', hireType === 'chauffeured' ? 'text-white/40' : 'text-ink-4')}>per day incl. driver</p>
                {hireType === 'chauffeured' && (
                  <p className="text-[11px] font-bold text-white/70 mt-1.5 uppercase tracking-wide">Selected ✓</p>
                )}
              </button>
            </>
          ) : (
            /* Chauffeured-only — single static tile */
            <div className="flex-1 min-w-[140px] bg-slate border-slate border rounded-[6px] px-4 py-3.5">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Chauffeured</p>
              {vehicle.chauffeur_price_poa ? (
                <p className="font-display font-extrabold text-[24px] tracking-tight text-amber-400">POA</p>
              ) : (
                <p className="font-display font-extrabold text-[24px] tracking-tight text-white">{formatCurrency(vehicle.chauffeur_price)}</p>
              )}
              <p className="text-[12px] text-white/40 mt-0.5">per day incl. driver</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking panel */}
      <BookingPanel
        vehicle={vehicle}
        availability={availability}
        hireAgreementClauses={hireAgreementClauses}
        externalHireType={isDual ? hireType : undefined}
      />
    </div>
  )
}
