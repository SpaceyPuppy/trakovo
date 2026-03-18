import { notFound } from 'next/navigation'
import VehicleForm from '@/components/admin/VehicleForm'
import BlockoutManager from '@/components/admin/BlockoutManager'
import { adminGetVehicle } from '@/lib/api'
import type { Metadata } from 'next'

interface Props { params: { id: string } }

export const metadata: Metadata = { title: 'Edit Vehicle' }
export const revalidate = 0

export default async function EditVehiclePage({ params }: Props) {
  let vehicle
  try { vehicle = await adminGetVehicle(params.id) }
  catch { notFound() }

  const initial = {
    name: vehicle.name,
    description: vehicle.description,
    price: vehicle.price,
    price_poa: vehicle.price_poa,
    chauffeur_price: vehicle.chauffeur_price,
    chauffeur_price_poa: vehicle.chauffeur_price_poa,
    day_rates: vehicle.day_rates,
    hire_modes: vehicle.meta.hire_modes ?? 'chauffeured_only',
    passengers: String(vehicle.meta.passengers ?? ''),
    transmission: vehicle.meta.transmission ?? 'Automatic',
    fuel: vehicle.meta.fuel ?? 'Petrol',
    is_available: vehicle.is_available,
    images: vehicle.media.map(m => m.url),
  }

  return (
    <div className="px-10 py-10">
      <a href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">← Back to Vehicles</a>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-2">{vehicle.name}</h1>
      <p className="text-[14px] text-ink-3 mb-8">Edit vehicle details and configuration.</p>
      <VehicleForm mode="edit" vehicleId={vehicle.id} publicIdDisplay={vehicle.public_id} initial={initial} />
      <div className="mt-8">
        <BlockoutManager vehicleId={vehicle.id} />
      </div>
    </div>
  )
}
