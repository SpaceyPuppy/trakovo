import { getVehicles } from '@/lib/api'
import { getLogoUrl, getSiteName } from '@/lib/site'
import MobileVehicleList from './MobileVehicleList'
import Link from 'next/link'
import type { Vehicle } from '@/types'
import type { Metadata } from 'next'
import { getFleetCategories } from '@/lib/fleet-categories'
import { getServiceCategoryAssignments } from '@/lib/service-category-settings'
import { fleetService, SERVICE_BUTTONS } from '@/lib/service-buttons'

export const metadata: Metadata = { title: 'Browse Fleet' }
export const revalidate = 0

export default async function HirePage({ searchParams }: { searchParams: Promise<{ service?: string; mode?: string; category?: string }> }) {
  let vehicles: Vehicle[] = []

  try {
    vehicles = await getVehicles()
  } catch { /* show empty state */ }

  const [siteName, logoUrl] = await Promise.all([getSiteName(), getLogoUrl()])
  const params = await searchParams
  const categories = await getFleetCategories().catch(() => [])
  const service = fleetService(params.service) ?? fleetService(params.mode)
  const assignments = service ? await getServiceCategoryAssignments(categories) : undefined
  const categoryId = service ? assignments![service] : categories.find(category => category.id === params.category)?.id
  const initialFilter = service || categoryId ? `category:${categoryId}` : 'all'
  const heading = service ? SERVICE_BUTTONS.find(button => button.id === service)!.title : 'Our Fleet'

  return (
    <div className="flex flex-col min-h-screen">
      {/* App header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border h-[56px] flex items-center px-4 gap-3">
        <Link href="/book" className="p-1.5 -ml-0.5 text-ink-2 hover:text-ink transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
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
          <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">Vehicle Hire</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[24px] tracking-tight mb-1">{heading}</h1>
          <p className="text-[13.5px] text-ink-3">Select a vehicle to book or enquire about your occasion.</p>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🚗</p>
            <p className="text-ink-3 text-[15px]">No vehicles available right now.</p>
            <p className="text-ink-4 text-[13px] mt-1">Please check back soon.</p>
          </div>
        ) : (
          <MobileVehicleList key={initialFilter} vehicles={vehicles} initialFilter={initialFilter} categories={categories} />
        )}
      </main>

      {/* Footer bar */}
      <div className="border-t border-border bg-white px-4 py-3 text-center">
        <p className="text-[11px] text-ink-4">{siteName} · Professional vehicle hire</p>
      </div>
    </div>
  )
}
