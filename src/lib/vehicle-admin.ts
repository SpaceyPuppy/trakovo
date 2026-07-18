import { ApiError, cents, optionalString, requireString } from './api-route'
import { generatePublicId, newId, withTransaction, type DbTransaction } from './db'
import { slugify } from './utils'

interface VehicleInput {
  name: string
  description: string
  price: number
  publicId?: string
  isAvailable: boolean
  publicBookingsEnabled: boolean
  vendorBookingsEnabled: boolean
  images: string[]
  dayRates: Array<Record<string, unknown>>
  chauffeurPrice: number
  pricePoa: boolean
  chauffeurPricePoa: boolean
  hireModes: 'chauffeured_only' | 'both'
  passengers: string
  transmission: string
  fuel: string
  licenceCategory: string
}

type VehicleRow = Record<string, unknown> & { id: string; is_available: number }

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function validateDayRates(value: unknown): Array<Record<string, unknown>> {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > 50) {
    throw new ApiError('day_rates must be an array with no more than 50 entries')
  }

  const rates = value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new ApiError(`day_rates[${index}] must be an object`)
    }
    const rate = raw as Record<string, unknown>
    const from = Number(rate.days_from)
    const to = rate.days_to === null || rate.days_to === '' ? null : Number(rate.days_to)
    if (!Number.isInteger(from) || from < 1 || (to !== null && (!Number.isInteger(to) || to < from))) {
      throw new ApiError(`day_rates[${index}] has an invalid day range`)
    }
    return {
      days_from: from,
      days_to: to,
      price: cents(rate.price ?? 0, `day_rates[${index}].price`),
      price_poa: bool(rate.price_poa, false),
      chauffeur_price: cents(rate.chauffeur_price ?? 0, `day_rates[${index}].chauffeur_price`),
      chauffeur_price_poa: bool(rate.chauffeur_price_poa, false),
    }
  }).sort((a, b) => Number(a.days_from) - Number(b.days_from))

  for (let index = 1; index < rates.length; index += 1) {
    const previousTo = rates[index - 1].days_to
    if (previousTo === null || Number(rates[index].days_from) <= Number(previousTo)) {
      throw new ApiError('Day-rate ranges must not overlap')
    }
  }
  return rates
}

export function parseVehicleInput(body: Record<string, unknown>, allowPublicId: boolean): VehicleInput {
  const meta = body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
    ? body.meta as Record<string, unknown>
    : {}
  const rawImages = body.images ?? []
  if (!Array.isArray(rawImages) || rawImages.length > 50) {
    throw new ApiError('images must be an array with no more than 50 entries')
  }
  const images = rawImages.map((image, index) =>
    requireString(image, `images[${index}]`, { maxLength: 191 })
  )

  const hireModes = meta.hire_modes ?? 'chauffeured_only'
  if (hireModes !== 'chauffeured_only' && hireModes !== 'both') {
    throw new ApiError('hire_modes must be chauffeured_only or both')
  }

  let publicId: string | undefined
  if (allowPublicId && body.public_id !== undefined) {
    publicId = requireString(body.public_id, 'public_id', { maxLength: 31 }).toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9-]+$/.test(publicId)) {
      throw new ApiError('public_id may contain only letters, numbers, and hyphens')
    }
  }

  return {
    name: requireString(body.name, 'name', { maxLength: 191 }),
    description: optionalString(body.description, 'description', 20000),
    price: cents(body.price ?? 0, 'price'),
    publicId,
    isAvailable: bool(body.is_available, true),
    publicBookingsEnabled: bool(body.public_bookings_enabled, true),
    vendorBookingsEnabled: bool(body.vendor_bookings_enabled, true),
    images,
    dayRates: validateDayRates(meta.day_rates),
    chauffeurPrice: cents(meta.chauffeur_price ?? 0, 'chauffeur_price'),
    pricePoa: bool(meta.price_poa, false),
    chauffeurPricePoa: bool(meta.chauffeur_price_poa, false),
    hireModes,
    passengers: optionalString(meta.passengers, 'passengers', 191),
    transmission: optionalString(meta.transmission, 'transmission', 191) || 'Automatic',
    fuel: optionalString(meta.fuel, 'fuel', 191) || 'Petrol',
    licenceCategory: optionalString(meta.licence_category, 'licence_category', 191),
  }
}

function contentType(url: string): string {
  const extension = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  } as Record<string, string>)[extension ?? ''] ?? 'image/jpeg'
}

async function insertMedia(transaction: DbTransaction, vehicleId: string, images: string[]) {
  if (images.length === 0) return
  const placeholders = images.map(() => '(?, ?, ?, ?, ?)').join(', ')
  const params = images.flatMap((url, index) => [newId(), vehicleId, url, contentType(url), index])
  await transaction.execute(
    `INSERT INTO VehicleMedia (id, vehicle_id, url, content_type, sort_order) VALUES ${placeholders}`,
    params
  )
}

async function loadVehicle(transaction: DbTransaction, id: string) {
  const vehicle = await transaction.queryOne<VehicleRow>('SELECT * FROM Vehicle WHERE id = ? LIMIT 1', [id])
  if (!vehicle) throw new ApiError('Vehicle not found', 404, 'NOT_FOUND')
  const media = await transaction.query('SELECT * FROM VehicleMedia WHERE vehicle_id = ? ORDER BY sort_order ASC', [id])
  return { ...vehicle, is_available: Boolean(vehicle.is_available), media }
}

export async function createVehicle(input: VehicleInput) {
  return withTransaction(async (transaction) => {
    const publicId = input.publicId ?? await generatePublicId('VHC', transaction)
    if (input.publicId) {
      const duplicate = await transaction.queryOne('SELECT id FROM Vehicle WHERE public_id = ? LIMIT 1 FOR UPDATE', [publicId])
      if (duplicate) throw new ApiError(`ID "${publicId}" is already in use`, 409, 'DUPLICATE_ID')
    }

    const baseSlug = slugify(input.name) || 'vehicle'
    const slugExists = await transaction.queryOne('SELECT id FROM Vehicle WHERE slug = ? LIMIT 1 FOR UPDATE', [baseSlug])
    const slug = slugExists ? `${baseSlug}-${publicId.toLowerCase()}` : baseSlug
    const id = newId()
    await transaction.execute(
      `INSERT INTO Vehicle (
         id, public_id, slug, name, description, price, chauffeur_price,
         price_poa, chauffeur_price_poa, day_rates, currency, hire_modes,
         passengers, transmission, fuel, licence_category, is_available,
         public_bookings_enabled, vendor_bookings_enabled, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AUD', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, publicId, slug, input.name, input.description, input.price, input.chauffeurPrice,
        input.pricePoa ? 1 : 0, input.chauffeurPricePoa ? 1 : 0,
        input.dayRates.length ? JSON.stringify(input.dayRates) : null,
        input.hireModes, input.passengers, input.transmission, input.fuel,
        input.licenceCategory, input.isAvailable ? 1 : 0,
        input.publicBookingsEnabled ? 1 : 0, input.vendorBookingsEnabled ? 1 : 0,
      ]
    )
    await insertMedia(transaction, id, input.images)
    return loadVehicle(transaction, id)
  })
}

export async function updateVehicle(id: string, input: VehicleInput) {
  return withTransaction(async (transaction) => {
    const existing = await transaction.queryOne('SELECT id FROM Vehicle WHERE id = ? LIMIT 1 FOR UPDATE', [id])
    if (!existing) throw new ApiError('Vehicle not found', 404, 'NOT_FOUND')

    await transaction.execute(
      `UPDATE Vehicle SET
         name = ?, description = ?, price = ?, chauffeur_price = ?, price_poa = ?,
         chauffeur_price_poa = ?, day_rates = ?, hire_modes = ?, passengers = ?,
         transmission = ?, fuel = ?, licence_category = ?, is_available = ?,
         public_bookings_enabled = ?, vendor_bookings_enabled = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        input.name, input.description, input.price, input.chauffeurPrice,
        input.pricePoa ? 1 : 0, input.chauffeurPricePoa ? 1 : 0,
        input.dayRates.length ? JSON.stringify(input.dayRates) : null,
        input.hireModes, input.passengers, input.transmission, input.fuel,
        input.licenceCategory, input.isAvailable ? 1 : 0,
        input.publicBookingsEnabled ? 1 : 0, input.vendorBookingsEnabled ? 1 : 0, id,
      ]
    )
    await transaction.execute('DELETE FROM VehicleMedia WHERE vehicle_id = ?', [id])
    await insertMedia(transaction, id, input.images)
    return loadVehicle(transaction, id)
  })
}

export async function deleteVehicle(id: string) {
  return withTransaction(async (transaction) => {
    const existing = await transaction.queryOne('SELECT id FROM Vehicle WHERE id = ? LIMIT 1 FOR UPDATE', [id])
    if (!existing) throw new ApiError('Vehicle not found', 404, 'NOT_FOUND')
    const bookings = await transaction.queryOne<{ count: number | string }>(
      'SELECT COUNT(*) AS count FROM Booking WHERE vehicle_id = ?', [id]
    )
    const count = Number(bookings?.count ?? 0)
    if (count > 0) {
      throw new ApiError(`Cannot delete: ${count} booking(s) exist for this vehicle.`, 409, 'VEHICLE_IN_USE')
    }
    await transaction.execute('DELETE FROM VehicleBlockout WHERE vehicle_id = ?', [id])
    await transaction.execute('DELETE FROM VendorVehicle WHERE vehicle_id = ?', [id])
    await transaction.execute('DELETE FROM VehicleMedia WHERE vehicle_id = ?', [id])
    await transaction.execute('DELETE FROM Vehicle WHERE id = ?', [id])
    return { ok: true }
  })
}
