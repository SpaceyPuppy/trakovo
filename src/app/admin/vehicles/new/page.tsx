import VehicleForm from '@/components/admin/VehicleForm'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getFleetCategories } from '@/lib/fleet-categories'

export const metadata: Metadata = { title: 'Add Vehicle' }

export const revalidate = 0

export default async function NewVehiclePage() {
  const categories = await getFleetCategories()
  return (
    <div className="px-10 py-10">
      <Link href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">← Back to Vehicles</Link>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-8">Add Vehicle</h1>
      <VehicleForm mode="create" categories={categories} />
    </div>
  )
}
