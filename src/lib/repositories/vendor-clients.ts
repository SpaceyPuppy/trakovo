import { query } from '@/lib/db'

export interface VendorClientSummary {
  id: string
  public_id: string
  vendor_id: string
  name: string
  email: string
  phone: string
  reference: string
  notes: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  _count: {
    bookings: number
  }
}

interface VendorClientSummaryRow {
  id: string
  public_id: string
  vendor_id: string
  name: string
  email: string
  phone: string
  reference: string
  notes: string
  is_active: number
  created_at: Date
  updated_at: Date
  booking_count: number
}

export async function listActiveVendorClientSummaries(vendorId: string): Promise<VendorClientSummary[]> {
  const rows = await query<VendorClientSummaryRow>(
    `SELECT
       vc.id,
       vc.public_id,
       vc.vendor_id,
       vc.name,
       vc.email,
       vc.phone,
       vc.reference,
       vc.notes,
       vc.is_active,
       vc.created_at,
       vc.updated_at,
       COUNT(b.id) AS booking_count
     FROM VendorClient vc
     LEFT JOIN Booking b ON b.vendor_client_id = vc.id
     WHERE vc.vendor_id = ? AND vc.is_active = 1
     GROUP BY
       vc.id,
       vc.public_id,
       vc.vendor_id,
       vc.name,
       vc.email,
       vc.phone,
       vc.reference,
       vc.notes,
       vc.is_active,
       vc.created_at,
       vc.updated_at
     ORDER BY vc.name ASC`,
    [vendorId]
  )

  return rows.map((row) => ({
    id: row.id,
    public_id: row.public_id,
    vendor_id: row.vendor_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    reference: row.reference,
    notes: row.notes,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    _count: { bookings: row.booking_count },
  }))
}
