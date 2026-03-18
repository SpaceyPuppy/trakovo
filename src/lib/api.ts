/**
 * Local data access layer — raw SQL via mysql2.
 * All functions preserve the same signatures used by page and component files.
 */

import { query, queryOne } from './db'
import type { Vehicle, AvailabilityRange, BookingResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

// ─── Mapper ───────────────────────────────────────────────────────────────────

function dbVehicleToVehicle(row: Row, media: Row[]): Vehicle {
  return {
    id: row.id,
    public_id: row.public_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price / 100,
    price_poa: Boolean(row.price_poa),
    chauffeur_price: row.chauffeur_price / 100,
    chauffeur_price_poa: Boolean(row.chauffeur_price_poa),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    day_rates: row.day_rates ? (JSON.parse(row.day_rates) as any[]).map((r) => ({
      ...r,
      price: r.price / 100,
      chauffeur_price: r.chauffeur_price / 100,
    })) : [],
    currency: row.currency,
    category: undefined,
    media: media
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, url: m.url, content_type: m.content_type })),
    meta: {
      hire_modes: row.hire_modes as Vehicle['meta']['hire_modes'],
      passengers: row.passengers,
      transmission: row.transmission,
      fuel: row.fuel,
      licence_category: row.licence_category ?? '',
      chauffeur_price: row.chauffeur_price / 100,
    },
    is_available: Boolean(row.is_available),
    public_bookings_enabled: row.public_bookings_enabled === undefined ? true : Boolean(row.public_bookings_enabled),
    vendor_bookings_enabled: row.vendor_bookings_enabled === undefined ? true : Boolean(row.vendor_bookings_enabled),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

async function vehiclesWithMedia(where: string, params: unknown[]): Promise<Vehicle[]> {
  const vehicles = await query<Row>(`SELECT * FROM Vehicle WHERE ${where} ORDER BY created_at DESC`, params)
  if (vehicles.length === 0) return []
  const ids = vehicles.map((v) => v.id)
  const media = await query<Row>(`SELECT * FROM VehicleMedia WHERE vehicle_id IN (?) ORDER BY sort_order ASC`, [ids])
  const mediaByVehicle: Record<string, Row[]> = {}
  for (const m of media) {
    if (!mediaByVehicle[m.vehicle_id]) mediaByVehicle[m.vehicle_id] = []
    mediaByVehicle[m.vehicle_id].push(m)
  }
  return vehicles.map((v) => dbVehicleToVehicle(v, mediaByVehicle[v.id] ?? []))
}

function dbBookingToResponse(b: Row): BookingResponse {
  return {
    id: b.id,
    public_id: b.public_id,
    status: b.status as BookingResponse['status'],
    hire_type: b.hire_type as BookingResponse['hire_type'],
    service_type: b.service_type ?? 'vehicle',
    start_date: b.start_date,
    end_date: b.end_date,
    total_days: b.total_days,
    daily_rate: b.daily_rate / 100,
    total_cost: b.total_cost / 100,
    vehicle: b.vehicle_id ? { id: b.vehicle_id, name: b.vehicle_name ?? '' } : undefined,
    contact_name: b.contact_name ?? undefined,
    contact_email: b.contact_email,
    contact_phone: b.contact_phone,
    driver_name: b.driver_name ?? undefined,
    driver_dob: b.driver_dob ?? undefined,
    driver_licence_number: b.driver_licence_number ?? undefined,
    driver_licence_expiry: b.driver_licence_expiry ?? undefined,
    id_document_url: b.id_document_path ? `/api/uploads/${b.id_document_path}` : undefined,
    licence_document_url: b.licence_document_path ? `/api/uploads/${b.licence_document_path}` : undefined,
    is_enquiry: Boolean(b.is_enquiry),
    vendor_name: b.vendor_name ?? undefined,
    created_at: b.created_at instanceof Date ? b.created_at.toISOString() : String(b.created_at),
  }
}

// ─── Public: Vehicles ─────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  return vehiclesWithMedia('is_available = 1 AND public_bookings_enabled = 1', [])
}

export async function getVehicle(slug: string): Promise<Vehicle> {
  const vehicles = await vehiclesWithMedia('slug = ?', [slug])
  if (vehicles.length === 0) throw new Error('Vehicle not found')
  return vehicles[0]
}

// ─── Public: Availability ─────────────────────────────────────────────────────

export async function getAvailability(vehicleId: string): Promise<AvailabilityRange[]> {
  const [bookings, blockouts] = await Promise.all([
    query<{ start_date: string; end_date: string }>(
      "SELECT start_date, end_date FROM Booking WHERE vehicle_id = ? AND status IN ('pending', 'confirmed')",
      [vehicleId]
    ),
    query<{ start_date: string; end_date: string }>(
      "SELECT start_date, end_date FROM VehicleBlockout WHERE vehicle_id = ? OR vehicle_id IS NULL",
      [vehicleId]
    ),
  ])
  return [...bookings, ...blockouts].map((b) => ({ start: b.start_date, end: b.end_date }))
}

// ─── Admin: Vehicles ──────────────────────────────────────────────────────────

export async function adminGetVehicles(): Promise<Vehicle[]> {
  return vehiclesWithMedia('1=1', [])
}

export async function adminGetVehicle(id: string): Promise<Vehicle> {
  const vehicles = await vehiclesWithMedia('id = ?', [id])
  if (vehicles.length === 0) throw new Error('Vehicle not found')
  return vehicles[0]
}

// ─── Admin: Bookings ──────────────────────────────────────────────────────────

export async function adminGetBookings(opts?: { limit?: number }): Promise<BookingResponse[]> {
  const limitClause = opts?.limit ? `LIMIT ${opts.limit}` : ''
  const bookings = await query<Row>(
    `SELECT b.*, v.name as vehicle_name, vnd.name as vendor_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     LEFT JOIN Vendor vnd ON b.vendor_id = vnd.id
     ORDER BY b.created_at DESC ${limitClause}`
  )
  return bookings.map(dbBookingToResponse)
}

export async function adminGetBooking(id: string): Promise<Row | null> {
  return queryOne<Row>(
    `SELECT b.*, v.name as vehicle_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.id = ? LIMIT 1`,
    [id]
  )
}
