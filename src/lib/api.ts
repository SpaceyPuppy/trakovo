/**
 * Local data access layer — replaces Fleetbase API calls with Prisma queries.
 * All functions preserve the same signatures used by page and component files.
 */

import { prisma } from './db'
import type { Vehicle, AvailabilityRange, BookingResponse } from '@/types'
import type { Vehicle as DbVehicle, VehicleMedia, Booking } from '@prisma/client'

type VehicleWithMedia = DbVehicle & { media: VehicleMedia[] }

// ─── Mapper ───────────────────────────────────────────────────────────────────

function dbVehicleToVehicle(row: VehicleWithMedia): Vehicle {
  return {
    id: row.id,
    public_id: row.public_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price / 100,
    chauffeur_price: row.chauffeur_price / 100,
    currency: row.currency,
    category: undefined,
    media: row.media
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, url: m.url, content_type: m.content_type })),
    meta: {
      hire_modes: row.hire_modes as Vehicle['meta']['hire_modes'],
      passengers: row.passengers,
      transmission: row.transmission,
      fuel: row.fuel,
      chauffeur_price: row.chauffeur_price / 100,
    },
    is_available: row.is_available,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

function dbBookingToResponse(b: Booking & { vehicle?: DbVehicle | null; vendor?: { name: string } | null }): BookingResponse {
  return {
    id: b.id,
    public_id: b.public_id,
    status: b.status as BookingResponse['status'],
    hire_type: b.hire_type as BookingResponse['hire_type'],
    service_type: (b as { service_type?: string }).service_type ?? 'vehicle',
    start_date: b.start_date,
    end_date: b.end_date,
    total_days: b.total_days,
    daily_rate: b.daily_rate / 100,
    total_cost: b.total_cost / 100,
    vehicle: b.vehicle ? { id: b.vehicle.id, name: b.vehicle.name } : undefined,
    contact_name: b.contact_name ?? undefined,
    contact_email: b.contact_email,
    contact_phone: b.contact_phone,
    driver_name: b.driver_name ?? undefined,
    driver_dob: b.driver_dob ?? undefined,
    driver_licence_number: b.driver_licence_number ?? undefined,
    driver_licence_expiry: b.driver_licence_expiry ?? undefined,
    id_document_url: b.id_document_path ? `/api/uploads/${b.id_document_path}` : undefined,
    licence_document_url: b.licence_document_path ? `/api/uploads/${b.licence_document_path}` : undefined,
    is_enquiry: b.is_enquiry,
    vendor_name: b.vendor?.name ?? undefined,
    created_at: b.created_at.toISOString(),
  }
}

// ─── Public: Vehicles ─────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const rows = await prisma.vehicle.findMany({
    where: { is_available: true },
    include: { media: true },
    orderBy: { created_at: 'desc' },
  })
  return rows.map(dbVehicleToVehicle)
}

export async function getVehicle(slug: string): Promise<Vehicle> {
  const row = await prisma.vehicle.findUnique({
    where: { slug },
    include: { media: true },
  })
  if (!row) throw new Error('Vehicle not found')
  return dbVehicleToVehicle(row)
}

// ─── Public: Availability ─────────────────────────────────────────────────────

export async function getAvailability(vehicleId: string): Promise<AvailabilityRange[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      vehicle_id: vehicleId,
      status: { in: ['pending', 'confirmed'] },
    },
    select: { start_date: true, end_date: true },
  })
  return bookings.map((b) => ({ start: b.start_date, end: b.end_date }))
}

// ─── Admin: Vehicles ──────────────────────────────────────────────────────────

export async function adminGetVehicles(): Promise<Vehicle[]> {
  const rows = await prisma.vehicle.findMany({
    include: { media: true },
    orderBy: { created_at: 'desc' },
  })
  return rows.map(dbVehicleToVehicle)
}

export async function adminGetVehicle(id: string): Promise<Vehicle> {
  const row = await prisma.vehicle.findUnique({
    where: { id },
    include: { media: true },
  })
  if (!row) throw new Error('Vehicle not found')
  return dbVehicleToVehicle(row)
}

// ─── Admin: Bookings ──────────────────────────────────────────────────────────

export async function adminGetBookings(opts?: { limit?: number }): Promise<BookingResponse[]> {
  const bookings = await prisma.booking.findMany({
    include: { vehicle: true, vendor: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
    ...(opts?.limit ? { take: opts.limit } : {}),
  })
  return bookings.map(dbBookingToResponse)
}
