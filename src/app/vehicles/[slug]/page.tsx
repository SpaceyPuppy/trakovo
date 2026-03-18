import { notFound } from 'next/navigation'

import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import BookingPanel from '@/components/booking/BookingPanel'
import { getVehicle, getAvailability } from '@/lib/api'
import { formatCurrency, getVehicleImage } from '@/lib/utils'
import { queryOne } from '@/lib/db'
import { parseHireAgreement } from '@/lib/hire-agreement-defaults'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const v = await getVehicle(params.slug)
    return { title: v.name }
  } catch { return { title: 'Vehicle' } }
}

export const revalidate = 0

export default async function VehicleDetailPage({ params }: Props) {
  let vehicle, availability
  try {
    vehicle = await getVehicle(params.slug)
    availability = await getAvailability(vehicle.id).catch(() => [])
  } catch { notFound() }

  const agreementRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'hire_agreement' LIMIT 1").catch(() => null)
  const hireAgreementClauses = parseHireAgreement(agreementRow?.value)

  const img = getVehicleImage(vehicle)
  const isDual = vehicle.meta.hire_modes === 'both'

  return (
    <>
      <NavWrapper />
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12 pb-16 md:pb-20 animate-fade-up">
        <a href="/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-7">← Back to Fleet</a>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
          {/* Left */}
          <div>
            {/* Image */}
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

            {/* Specs — only 3 cells */}
            <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden mb-7">
              {[
                ['Passengers', vehicle.meta.passengers],
                ['Transmission', vehicle.meta.transmission],
                ['Fuel', vehicle.meta.fuel],
              ].filter(([, v]) => !!v).map(([label, val]) => (
                <div key={label} className="bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-display font-bold text-[16px]">{val}</p>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="flex gap-4 flex-wrap">
              {isDual && (
                <div className="flex-1 min-w-[140px] border border-border rounded-[6px] px-4 py-3.5">
                  <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-1">Self-Drive</p>
                  {vehicle.price_poa ? (
                    <p className="font-display font-extrabold text-[24px] tracking-tight text-amber-600">POA</p>
                  ) : (
                    <p className="font-display font-extrabold text-[24px] tracking-tight">{formatCurrency(vehicle.price)}</p>
                  )}
                  <p className="text-[12px] text-ink-4 mt-0.5">per day</p>
                </div>
              )}
              <div className="flex-1 min-w-[140px] bg-slate border-slate border rounded-[6px] px-4 py-3.5">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Chauffeured</p>
                {vehicle.chauffeur_price_poa ? (
                  <p className="font-display font-extrabold text-[24px] tracking-tight text-amber-400">POA</p>
                ) : (
                  <p className="font-display font-extrabold text-[24px] tracking-tight text-white">{formatCurrency(vehicle.chauffeur_price)}</p>
                )}
                <p className="text-[12px] text-white/40 mt-0.5">per day incl. driver</p>
              </div>
            </div>
          </div>

          {/* Booking panel */}
          <BookingPanel vehicle={vehicle} availability={availability} hireAgreementClauses={hireAgreementClauses} />
        </div>
      </main>
      <Footer />
    </>
  )
}
