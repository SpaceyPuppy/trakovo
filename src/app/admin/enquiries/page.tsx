import { query } from '@/lib/db'
import EnquiriesClient from './EnquiriesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Enquiries' }
export const revalidate = 0

export default async function EnquiriesPage() {
  const enquiries = await query<{
    id: string
    public_id: string
    enquiry_status: string | null
    hire_type: string
    start_date: string
    end_date: string
    total_days: number
    contact_name: string | null
    contact_email: string
    contact_phone: string
    vehicle_name: string | null
    created_at: Date
  }>(
    `SELECT b.id, b.public_id, b.enquiry_status, b.hire_type, b.start_date, b.end_date,
            b.total_days, b.contact_name, b.contact_email, b.contact_phone,
            v.name as vehicle_name, b.created_at
     FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.is_enquiry = 1
     ORDER BY b.created_at DESC`
  )

  const serialised = enquiries.map(e => ({
    ...e,
    enquiry_status: e.enquiry_status ?? 'new',
    created_at: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
  }))

  return <EnquiriesClient enquiries={serialised} />
}
