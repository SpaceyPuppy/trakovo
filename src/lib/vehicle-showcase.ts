import type { Vehicle } from '@/types'

export function occasionEnquiryVehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(vehicle => vehicle.is_available && vehicle.public_bookings_enabled
    && (vehicle.show_on_special_occasions || vehicle.enquiry_only))
}

export function showcaseVehicles(
  vehicles: Vehicle[],
  placement: 'feature_on_homepage' | 'show_on_special_occasions',
  limit?: number
): Vehicle[] {
  const selected = vehicles.filter(vehicle =>
    vehicle.is_available && vehicle.public_bookings_enabled && vehicle[placement]
  )
  return limit === undefined ? selected : selected.slice(0, limit)
}
