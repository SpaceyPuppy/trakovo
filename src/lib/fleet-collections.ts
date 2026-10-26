import type { Vehicle } from '@/types'

export const FLEET_COLLECTIONS = [
  { id: 'buses', label: 'Buses', description: 'Transport for groups, outings and shared journeys.', symbol: 'bus' },
  { id: 'chauffeured', label: 'Chauffeured Vehicles', description: 'Travel with a professional driver for business or leisure.', symbol: 'car' },
  { id: 'special-occasions', label: 'Special Occasion Vehicles', description: 'Explore vehicles for weddings, formals and celebrations.', symbol: 'occasion' },
] as const

export type FleetCollection = typeof FLEET_COLLECTIONS[number]['id']

export function matchesFleetCollection(vehicle: Vehicle, collection: FleetCollection): boolean {
  const groups = vehicle.fleet_categories?.map(category => category.homepage_group) ?? []
  if (collection === 'buses') return groups.includes('buses')
  if (collection === 'special-occasions') return groups.includes('special-occasions') || vehicle.show_on_special_occasions || vehicle.enquiry_only
  if (groups.includes('chauffeured')) return true
  return !groups.includes('buses') && !vehicle.enquiry_only && !vehicle.show_on_special_occasions && !groups.includes('special-occasions')
    && ['chauffeured_only', 'both'].includes(vehicle.meta.hire_modes ?? '')
}

/** Stable partition: matching vehicles first, retaining the rest of the public fleet. */
export function prioritiseFleet(vehicles: Vehicle[], collection: string | undefined): Vehicle[] {
  if (!FLEET_COLLECTIONS.some(item => item.id === collection)) return vehicles
  const matches = (vehicle: Vehicle) => matchesFleetCollection(vehicle, collection as FleetCollection)
  return [...vehicles.filter(matches), ...vehicles.filter(vehicle => !matches(vehicle))]
}
