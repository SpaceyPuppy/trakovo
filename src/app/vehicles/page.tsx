import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import FleetGrid from './FleetGrid'
import { getVehicles } from '@/lib/api'
import { FLEET_COLLECTIONS, prioritiseFleet } from '@/lib/fleet-collections'
import { getFleetCategories } from '@/lib/fleet-categories'
import { getServiceCategoryAssignments } from '@/lib/service-category-settings'
import { fleetService, SERVICE_BUTTONS } from '@/lib/service-buttons'
import type { Metadata } from 'next'
import type { Vehicle } from '@/types'

export const metadata: Metadata = { title: 'Our Fleet' }
export const revalidate = 0

export default async function VehiclesPage(props: { searchParams: Promise<{ service?: string; hire?: string; priority?: string; category?: string }> }) {
  const searchParams = await props.searchParams;
  let vehicles: Vehicle[] = []
  try { vehicles = await getVehicles() } catch { /* handled in UI */ }

  const categories = await getFleetCategories().catch(() => [])
  const service = fleetService(searchParams.service) ?? fleetService(searchParams.hire === 'chauffeur' ? 'chauffeured' : searchParams.hire)
  const assignments = service ? await getServiceCategoryAssignments(categories) : undefined
  const categoryId = service ? assignments![service] : searchParams.category
  const selectedCategory = categories.find(category => category.id === categoryId)
  const initialFilter = service ? `category:${categoryId}` : selectedCategory ? `category:${selectedCategory.id}` : 'all'
  const heading = service ? SERVICE_BUTTONS.find(button => button.id === service)!.title : selectedCategory ? selectedCategory.name : 'Choose your vehicle'
  const priority = FLEET_COLLECTIONS.find(collection => collection.id === searchParams.priority)
  vehicles = prioritiseFleet(vehicles, priority?.id)

  return (
    <>
      <NavWrapper />
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14 pb-16 md:pb-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-accent inline-block" />Our Fleet
        </p>
        <h1 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-10">
          {heading}
        </h1>
        {priority && <p className="text-[14px] text-ink-3 -mt-6 mb-7">{priority.label} shown first. Browse the full fleet below.</p>}
        <FleetGrid key={initialFilter} vehicles={vehicles} initialFilter={initialFilter} categories={categories} />
      </main>
      <Footer />
    </>
  )
}
