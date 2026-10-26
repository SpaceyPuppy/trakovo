import { ApiError, requireString } from './api-route'
import { getSettings } from './settings'
import { withTransaction } from './db'
import { resolveServiceCategories, SERVICE_CATEGORY_KEYS } from './service-buttons'
import type { FleetCategory } from '@/types'
import type { FleetService, ServiceCategoryAssignments } from './service-buttons'

export async function getServiceCategoryAssignments(categories: FleetCategory[]): Promise<ServiceCategoryAssignments> {
  try {
    return resolveServiceCategories(await getSettings(Object.values(SERVICE_CATEGORY_KEYS)), categories)
  } catch {
    return { selfdrive: '', chauffeured: '' }
  }
}

export async function saveServiceCategoryAssignments(body: Record<string, unknown>): Promise<ServiceCategoryAssignments> {
  const services = Object.keys(SERVICE_CATEGORY_KEYS) as FleetService[]
  const assignments = Object.fromEntries(services.map(service => [service,
    requireString(body[service], `${service === 'selfdrive' ? 'Self-Drive Buses' : 'Chauffeured Hire'} category`, { maxLength: 191, allowEmpty: true }),
  ])) as ServiceCategoryAssignments
  return withTransaction(async transaction => {
    const ids = [...new Set(Object.values(assignments).filter(Boolean))].sort()
    if (ids.length) {
      const categories = await transaction.query<{ id: string }>('SELECT id FROM FleetCategory WHERE id IN (?) ORDER BY id FOR UPDATE', [ids])
      if (categories.length !== ids.length) throw new ApiError('A selected category no longer exists. Refresh and choose another category.')
    }
    await transaction.execute(
      'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()), (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
      services.flatMap(service => [SERVICE_CATEGORY_KEYS[service], assignments[service]])
    )
    return assignments
  })
}
