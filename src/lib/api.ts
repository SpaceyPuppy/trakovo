/**
 * Local data access layer — raw SQL via mysql2.
 * All functions preserve the same signatures used by page and component files.
 */

import { query, queryOne } from './db'
import { mapBookingRow, type BookingDatabaseRow } from './booking-mapper'
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

export interface AdminDashboardStats {
  totalVehicles: number
  availableVehicles: number
  totalBookings: number
  pendingBookings: number
}

export async function adminGetDashboardStats(): Promise<AdminDashboardStats> {
  const row = await queryOne<{
    total_vehicles: number | string
    available_vehicles: number | string
    total_bookings: number | string
    pending_bookings: number | string
  }>(
    `SELECT
       vehicle_stats.total_vehicles,
       vehicle_stats.available_vehicles,
       booking_stats.total_bookings,
       booking_stats.pending_bookings
     FROM (
       SELECT
         COUNT(*) AS total_vehicles,
         COALESCE(SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END), 0) AS available_vehicles
       FROM Vehicle
     ) vehicle_stats
     CROSS JOIN (
       SELECT
         COUNT(*) AS total_bookings,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_bookings
       FROM Booking
     ) booking_stats`
  )

  return {
    totalVehicles: Number(row?.total_vehicles ?? 0),
    availableVehicles: Number(row?.available_vehicles ?? 0),
    totalBookings: Number(row?.total_bookings ?? 0),
    pendingBookings: Number(row?.pending_bookings ?? 0),
  }
}

// ─── Admin: Bookings ──────────────────────────────────────────────────────────

export type AdminBookingStatusFilter = 'all' | 'pending' | 'confirmed' | 'enquiry' | 'completed' | 'cancelled'
export type AdminBookingSort = 'start_date' | 'public_id' | 'created_at' | 'contact_name' | 'vehicle'
export type AdminBookingSortDirection = 'asc' | 'desc'

const ADMIN_BOOKING_SORT_COLUMNS: Record<AdminBookingSort, string> = {
  start_date: 'b.start_date',
  public_id: 'b.public_id',
  created_at: 'b.created_at',
  contact_name: 'COALESCE(b.contact_name, b.driver_name, \'\')',
  vehicle: 'COALESCE(v.name, b.service_type, \'\')',
}

function adminBookingStatusWhere(status: AdminBookingStatusFilter | undefined) {
  if (!status || status === 'all') return { clause: '', params: [] as unknown[] }
  if (status === 'enquiry') return { clause: 'WHERE b.is_enquiry = 1', params: [] as unknown[] }
  return {
    clause: 'WHERE b.status = ? AND COALESCE(b.is_enquiry, 0) = 0',
    params: [status] as unknown[],
  }
}

export async function adminGetBookings(opts?: {
  limit?: number
  offset?: number
  status?: AdminBookingStatusFilter
  sort?: AdminBookingSort
  direction?: AdminBookingSortDirection
}): Promise<BookingResponse[]> {
  const requestedLimit = Math.trunc(opts?.limit ?? 0)
  const limit = requestedLimit > 0 ? Math.min(requestedLimit, 200) : 0
  const offset = Math.max(0, Math.trunc(opts?.offset ?? 0))
  const limitClause = limit > 0 ? `LIMIT ${limit} OFFSET ${offset}` : ''
  const statusWhere = adminBookingStatusWhere(opts?.status)
  const sort = opts?.sort && opts.sort in ADMIN_BOOKING_SORT_COLUMNS ? opts.sort : 'start_date'
  const direction = opts?.direction === 'desc' ? 'DESC' : 'ASC'
  const sortColumn = ADMIN_BOOKING_SORT_COLUMNS[sort]
  const bookings = await query<Row>(
    `SELECT b.*, v.name as vehicle_name, vnd.name as vendor_name, vc.name as vendor_client_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     LEFT JOIN Vendor vnd ON b.vendor_id = vnd.id
     LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
     ${statusWhere.clause}
     ORDER BY ${sortColumn} ${direction}, b.public_id ASC ${limitClause}`,
    statusWhere.params
  )
  return bookings.map((booking) => mapBookingRow<BookingResponse['status']>(
    booking as BookingDatabaseRow<BookingResponse['status']>
  ))
}

export async function adminGetBookingStatusCounts(): Promise<Record<AdminBookingStatusFilter, number>> {
  const rows = await query<{ status: string; count: number | string }>(
    `SELECT
       CASE WHEN b.is_enquiry = 1 THEN 'enquiry' ELSE b.status END AS status,
       COUNT(*) AS count
     FROM Booking b
     GROUP BY CASE WHEN b.is_enquiry = 1 THEN 'enquiry' ELSE b.status END`
  )
  const counts: Record<AdminBookingStatusFilter, number> = {
    all: 0, pending: 0, confirmed: 0, enquiry: 0, completed: 0, cancelled: 0,
  }
  for (const row of rows) {
    const status = row.status as AdminBookingStatusFilter
    if (status in counts && status !== 'all') counts[status] = Number(row.count)
  }
  counts.all = Object.entries(counts)
    .filter(([key]) => key !== 'all')
    .reduce((sum, [, value]) => sum + value, 0)
  return counts
}

export async function adminGetBookingCount(status?: AdminBookingStatusFilter): Promise<number> {
  const statusWhere = adminBookingStatusWhere(status)
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) AS count FROM Booking b ${statusWhere.clause}`,
    statusWhere.params
  )
  return Number(row?.count ?? 0)
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
