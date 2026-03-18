import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import FleetGrid from './FleetGrid'
import { getVehicles } from '@/lib/api'
import type { Metadata } from 'next'
import type { Vehicle } from '@/types'

export const metadata: Metadata = { title: 'Our Fleet' }
export const revalidate = 0

const FILTER_LABELS: Record<string, string> = {
  chauffeur: 'Chauffeured Hire',
  selfdrive: 'Self-Drive (Dry Hire)',
}

export default async function VehiclesPage({ searchParams }: { searchParams: { hire?: string } }) {
  let vehicles: Vehicle[] = []
  try { vehicles = await getVehicles() } catch { /* handled in UI */ }

  const hire = searchParams.hire ?? 'all'
  const validFilters = ['all', 'chauffeur', 'selfdrive']
  const initialFilter = validFilters.includes(hire) ? hire : 'all'
  const filterLabel = FILTER_LABELS[initialFilter]

  return (
    <>
      <NavWrapper />
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14 pb-16 md:pb-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-accent inline-block" />Our Fleet
        </p>
        <h1 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-10">
          {filterLabel ? `${filterLabel} Vehicles` : 'Choose your vehicle'}
        </h1>
        <FleetGrid vehicles={vehicles} initialFilter={initialFilter} />
      </main>
      <Footer />
    </>
  )
}
