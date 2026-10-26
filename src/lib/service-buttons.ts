import type { FleetCategory, Vehicle } from '@/types'

export const SERVICE_BUTTONS = [
  { id: 'selfdrive', title: 'Self-Drive Buses', icon: '🔑', description: 'Explore buses for self-drive hire, outings and group journeys.', href: '/vehicles?service=selfdrive' },
  { id: 'chauffeured', title: 'Chauffeured Hire', icon: '🤵', description: 'Travel with a professional driver for business, airports and events.', href: '/vehicles?service=chauffeured' },
  { id: 'occasions', title: 'Special Occasions', icon: '🥂', description: 'Classic and luxury vehicles for weddings, formals and celebrations.', href: '/special-occasions' },
  { id: 'taxi', title: 'Taxi', icon: '🚕', description: 'Taxi bookings for local and regional trips.', href: '/book/taxi' },
] as const

export const SERVICE_CATEGORY_KEYS = {
  selfdrive: 'service_selfdrive_category_id',
  chauffeured: 'service_chauffeured_category_id',
} as const

export type FleetService = keyof typeof SERVICE_CATEGORY_KEYS
export type ServiceCategoryAssignments = Record<FleetService, string>

export function fleetService(value: string | undefined): FleetService | undefined {
  return value === 'selfdrive' || value === 'chauffeured' ? value : undefined
}

/** Missing settings use existing matching categories; explicit empty/deleted selections stay empty. */
export function resolveServiceCategories(settings: Record<string, string>, categories: FleetCategory[]): ServiceCategoryAssignments {
  function resolve(service: FleetService, name: string, group: string): string {
    const configured = settings[SERVICE_CATEGORY_KEYS[service]]
    if (configured !== undefined) return configured
    return (categories.find(category => category.name.toLowerCase() === name)
      ?? categories.find(category => category.homepage_group === group))?.id ?? ''
  }
  return {
    selfdrive: resolve('selfdrive', 'bus', 'buses'),
    chauffeured: resolve('chauffeured', 'chauffeured vehicles', 'chauffeured'),
  }
}

export function filterFleetVehicles(vehicles: Vehicle[], filter: string): Vehicle[] {
  if (filter === 'selfdrive') return vehicles.filter(vehicle => vehicle.meta.hire_modes === 'both')
  if (filter.startsWith('category:')) return vehicles.filter(vehicle => vehicle.fleet_categories.some(category => `category:${category.id}` === filter))
  return vehicles
}
