import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import BookingPanel from '@/components/booking/BookingPanel'
import { prisma } from '@/lib/db'
import { getVehicle, getAvailability } from '@/lib/api'
import { formatCurrency, getVehicleImage } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const v = await getVehicle(params.slug)
    return { title: v.name }
  } catch { return { title: 'Vehicle' } }
}

export const revalidate = 60

export default async function BookVehiclePage({ params }: Props) {
  let vehicle, availability
  let logoUrl: string | undefined

  try {
    vehicle = await getVehicle(params.slug)
    availability = await getAvailability(vehicle.id).catch(() => [])
  } catch { notFound() }

  try {
    const logo = await prisma.setting.findUnique({ where: { key: 'logo_path' } })
    if (logo?.value) logoUrl = '/api/logo'
  } catch { /* no logo */ }

  const img = getVehicleImage(vehicle)
  const isDual = vehicle.meta.hire_modes === 'both'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Trakovo'

  return (
    <div className="flex flex-col min-h-screen">
      {/* App header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border h-[56px] flex items-center px-3 gap-2">
        <Link href="/book" className="p-2 -ml-1 text-ink-2 hover:text-ink transition-colors flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName} className="h-6 w-auto object-contain max-w-[100px]" />
        ) : (
          <span className="font-display font-extrabold text-[15px] tracking-tight">{siteName}</span>
        )}
        <span className="flex-1 text-center font-display font-bold text-[14px] truncate px-2">{vehicle.name}</span>
        <div className="w-[38px] flex-shrink-0" /> {/* Balance the back button */}
      </header>

      {/* Vehicle image */}
      <div className="w-full aspect-[16/9] bg-slate relative overflow-hidden flex items-center justify-center flex-shrink-0">
        {img ? (
          <Image src={img} alt={vehicle.name} fill className="object-cover" />
        ) : (
          <span className="text-[80px] opacity-30">🚗</span>
        )}
        {/* Overlay badge */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white">
          <p className="font-display font-bold text-[14px]">{vehicle.name}</p>
          <p className="text-[11px] text-white/60 mt-0.5">
            From {formatCurrency(isDual ? vehicle.price : vehicle.chauffeur_price)}/day
          </p>
        </div>
      </div>

      {/* Vehicle details */}
      <div className="px-4 pt-5 pb-4 bg-white border-b border-border">
        {vehicle.category && (
          <p className="text-[10.5px] font-bold text-accent uppercase tracking-widest mb-1">{vehicle.category.name}</p>
        )}
        <h1 className="font-display font-extrabold text-[22px] tracking-tight mb-3">{vehicle.name}</h1>

        {/* Specs row */}
        {(vehicle.meta.passengers || vehicle.meta.transmission || vehicle.meta.fuel) && (
          <div className="flex gap-3 flex-wrap text-[12.5px] text-ink-3 mb-3">
            {vehicle.meta.passengers && <span>👥 {vehicle.meta.passengers} passengers</span>}
            {vehicle.meta.transmission && <span>⚙️ {vehicle.meta.transmission}</span>}
            {vehicle.meta.fuel && <span>⛽ {vehicle.meta.fuel}</span>}
          </div>
        )}

        {/* Pricing chips */}
        <div className="flex gap-2 flex-wrap">
          {isDual && (
            <div className="border border-border rounded-[6px] px-3 py-2">
              <p className="text-[10px] text-ink-4 uppercase font-semibold tracking-wider">Self-Drive</p>
              <p className="font-display font-extrabold text-[18px]">{formatCurrency(vehicle.price)}<span className="text-[11px] font-normal text-ink-4">/day</span></p>
            </div>
          )}
          <div className="bg-slate rounded-[6px] px-3 py-2">
            <p className="text-[10px] text-white/50 uppercase font-semibold tracking-wider">Chauffeured</p>
            <p className="font-display font-extrabold text-[18px] text-white">{formatCurrency(vehicle.chauffeur_price)}<span className="text-[11px] font-normal text-white/50">/day</span></p>
          </div>
        </div>

        {vehicle.description && (
          <p className="text-[13.5px] text-ink-3 leading-relaxed mt-3">{vehicle.description}</p>
        )}
      </div>

      {/* Booking panel */}
      <div className="px-4 pt-5 pb-10 flex-1 bg-bg">
        <BookingPanel vehicle={vehicle} availability={availability} vehicleBasePath="/book" />
      </div>
    </div>
  )
}
