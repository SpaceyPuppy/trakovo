import { prisma } from '@/lib/db'
import { getVehicles } from '@/lib/api'
import { getSiteName } from '@/lib/site'
import MobileVehicleList from './MobileVehicleList'
import type { Vehicle } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Browse Fleet' }
export const revalidate = 60

export default async function BookPage() {
  let vehicles: Vehicle[] = []
  let logoUrl: string | undefined

  try {
    vehicles = await getVehicles()
  } catch { /* show empty state */ }

  try {
    const logo = await prisma.setting.findUnique({ where: { key: 'logo_path' } })
    if (logo?.value) logoUrl = '/api/logo'
  } catch { /* no logo */ }

  const siteName = await getSiteName()

  return (
    <div className="flex flex-col min-h-screen">
      {/* App header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border h-[56px] flex items-center px-4 gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName} className="h-7 w-auto object-contain max-w-[140px]" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-[13px] font-extrabold">
              {siteName.charAt(0)}
            </span>
            <span className="font-display font-extrabold text-[16px] tracking-tight">{siteName}</span>
          </div>
        )}
        <div className="ml-auto">
          <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">Book a vehicle</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[24px] tracking-tight mb-1">Our Fleet</h1>
          <p className="text-[13.5px] text-ink-3">Select a vehicle to check availability and book.</p>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🚗</p>
            <p className="text-ink-3 text-[15px]">No vehicles available right now.</p>
            <p className="text-ink-4 text-[13px] mt-1">Please check back soon.</p>
          </div>
        ) : (
          <MobileVehicleList vehicles={vehicles} />
        )}
      </main>

      {/* Footer bar */}
      <div className="border-t border-border bg-white px-4 py-3 text-center">
        <p className="text-[11px] text-ink-4">{siteName} · Professional vehicle hire</p>
      </div>
    </div>
  )
}
