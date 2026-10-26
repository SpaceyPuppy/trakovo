import { notFound } from 'next/navigation'
import Link from 'next/link'
import VehicleForm from '@/components/admin/VehicleForm'
import BlockoutManager from '@/components/admin/BlockoutManager'
import VendorAccessManager from '@/components/admin/VendorAccessManager'
import { adminGetVehicle } from '@/lib/api'
import { getFleetCategories } from '@/lib/fleet-categories'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Edit Vehicle' }
export const revalidate = 0

export default async function EditVehiclePage(props: Props) {
  const params = await props.params;
  let vehicle
  try { vehicle = await adminGetVehicle(params.id) }
  catch { notFound() }

  const categories = await getFleetCategories()
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
    licence_category: vehicle.meta.licence_category ?? '',
    is_available: vehicle.is_available,
    public_bookings_enabled: vehicle.public_bookings_enabled,
    vendor_bookings_enabled: vehicle.vendor_bookings_enabled,
    feature_on_homepage: vehicle.feature_on_homepage,
    show_on_special_occasions: vehicle.show_on_special_occasions,
    enquiry_only: vehicle.enquiry_only,
    category_ids: vehicle.fleet_categories.map(category => category.id),
    images: vehicle.media.map(m => m.url),
  }

  return (
    <div className="px-10 py-10">
      <Link href="/admin/vehicles" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 font-medium hover:text-ink transition-colors mb-6">← Back to Vehicles</Link>
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-2">{vehicle.name}</h1>
      <p className="text-[14px] text-ink-3 mb-8">Edit vehicle details and configuration.</p>
      <VehicleForm mode="edit" vehicleId={vehicle.id} publicIdDisplay={vehicle.public_id} initial={initial} categories={categories} />
      <div className="mt-8">
        <BlockoutManager vehicleId={vehicle.id} />
      </div>
      <div className="mt-8 max-w-[720px]">
        <VendorAccessManager vehicleId={vehicle.id} />
      </div>
    </div>
  )
}
