import { query } from '@/lib/db'

export type VendorSummarySort = 'name_asc' | 'created_at_desc'

export interface VendorSummary {
  id: string
  name: string
  public_id: string
  username: string
  contact_email: string
  contact_phone: string
  is_active: boolean
  created_at: Date
  _count: {
    bookings: number
    clients: number
  }
}

interface VendorSummaryRow {
  id: string
  name: string
  public_id: string
  username: string
  contact_email: string
  contact_phone: string
  is_active: number
  created_at: Date
  booking_count: number
  client_count: number
}

const SORT_SQL: Record<VendorSummarySort, string> = {
  name_asc: 'v.name ASC',
  created_at_desc: 'v.created_at DESC',
}

export async function listVendorSummaries(sort: VendorSummarySort): Promise<VendorSummary[]> {
  const rows = await query<VendorSummaryRow>(
    `SELECT
       v.id,
       v.name,
       v.public_id,
       v.username,
       v.contact_email,
       v.contact_phone,
       v.is_active,
       v.created_at,
       COALESCE(bookings.booking_count, 0) AS booking_count,
       COALESCE(clients.client_count, 0) AS client_count
     FROM Vendor v
     LEFT JOIN (
       SELECT vendor_id, COUNT(*) AS booking_count
       FROM Booking
       WHERE vendor_id IS NOT NULL
       GROUP BY vendor_id
     ) bookings ON bookings.vendor_id = v.id
     LEFT JOIN (
       SELECT vendor_id, COUNT(*) AS client_count
       FROM VendorClient
       GROUP BY vendor_id
     ) clients ON clients.vendor_id = v.id
     ORDER BY ${SORT_SQL[sort]}`
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    public_id: row.public_id,
    username: row.username,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    _count: {
      bookings: row.booking_count,
      clients: row.client_count,
    },
  }))
}
