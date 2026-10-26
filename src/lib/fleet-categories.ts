import { ApiError, requireString } from './api-route'
import { newId, query, withTransaction } from './db'
import type { FleetCategory } from '@/types'

export function getFleetCategories(): Promise<FleetCategory[]> {
  return query<FleetCategory>('SELECT id, name, homepage_group FROM FleetCategory ORDER BY name')
}

export function parseFleetCategory(body: Record<string, unknown>): Omit<FleetCategory, 'id'> {
  const name = requireString(body.name, 'Category name', { maxLength: 80 })
  const normalised = name.toLowerCase().replace(/[-\s]+/g, ' ')
  if (['all', 'all vehicles', 'self drive available'].includes(normalised)) {
    throw new ApiError('That name is reserved for a built-in fleet filter')
  }
  const homepageGroup = body.homepage_group ?? ''
  if (!['', 'buses', 'chauffeured', 'special-occasions'].includes(homepageGroup as string)) throw new ApiError('Choose a valid homepage group')
  return { name, homepage_group: homepageGroup as FleetCategory['homepage_group'] }
}

export async function saveFleetCategory(input: Omit<FleetCategory, 'id'>, existingId?: string): Promise<FleetCategory> {
  const id = existingId ?? newId()
  try {
    return await withTransaction(async transaction => {
      if (existingId && !await transaction.queryOne('SELECT id FROM FleetCategory WHERE id = ? FOR UPDATE', [id])) {
        throw new ApiError('Category not found', 404)
      }
      const duplicate = await transaction.queryOne('SELECT id FROM FleetCategory WHERE name = ? AND id <> ? LIMIT 1', [input.name, id])
      if (duplicate) throw new ApiError('A category with that name already exists')
      if (existingId) await transaction.execute('UPDATE FleetCategory SET name = ?, homepage_group = ? WHERE id = ?', [input.name, input.homepage_group, id])
      else await transaction.execute('INSERT INTO FleetCategory (id, name, homepage_group) VALUES (?, ?, ?)', [id, input.name, input.homepage_group])
      return { id, ...input }
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ApiError('A category with that name already exists')
    throw error
  }
}

export async function deleteFleetCategory(id: string) {
  return withTransaction(async transaction => {
    const category = await transaction.queryOne('SELECT id FROM FleetCategory WHERE id = ? FOR UPDATE', [id])
    if (!category) throw new ApiError('Category not found', 404)
    await transaction.execute('DELETE FROM FleetCategory WHERE id = ?', [id])
    return { ok: true }
  })
}
