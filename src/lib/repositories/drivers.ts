import { query } from '@/lib/db'

export interface DriverSummary {
  id: string
  name: string
  username: string
  email: string
  phone: string
  is_active: boolean
  created_at: Date
  _count: {
    bookings: number
  }
}

interface DriverSummaryRow {
  id: string
  name: string
  username: string
  email: string
  phone: string
  is_active: number
  created_at: Date
  booking_count: number
}

export async function listDriverSummaries(): Promise<DriverSummary[]> {
  const rows = await query<DriverSummaryRow>(
    `SELECT
       d.id,
       d.name,
       d.username,
       d.email,
       d.phone,
       d.is_active,
       d.created_at,
       COALESCE(bookings.booking_count, 0) AS booking_count
     FROM Driver d
     LEFT JOIN (
       SELECT driver_id, COUNT(*) AS booking_count
       FROM Booking
       WHERE driver_id IS NOT NULL
       GROUP BY driver_id
     ) bookings ON bookings.driver_id = d.id
     ORDER BY d.name ASC`
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    _count: { bookings: row.booking_count },
  }))
}
