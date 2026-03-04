import VehicleForm from '@/components/admin/VehicleForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add Vehicle' }

export default function NewVehiclePage() {
  return (
    <div className="px-10 py-10">
      <a href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">← Back to Vehicles</a>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-8">Add Vehicle</h1>
      <VehicleForm mode="create" />
    </div>
  )
}
