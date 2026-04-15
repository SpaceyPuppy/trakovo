import { query } from '@/lib/db'
import InvoicesList from './InvoicesList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoices' }
export const revalidate = 0

interface InvoiceRow {
  id: string
  public_id: string
  booking_id: string
  booking_public_id: string
  amount: number
  currency: string
  status: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  contact_name: string | null
  contact_email: string
  vehicle_name: string | null
  vendor_name: string | null
  hire_type: string
  service_type: string | null
  start_date: string
  end_date: string
}

export default async function InvoicesPage() {
  const invoices = await query<InvoiceRow>(`
    SELECT i.id, i.public_id, i.booking_id, i.amount, i.currency, i.status,
           i.due_date, i.paid_at, i.notes,
           i.created_at,
           b.public_id as booking_public_id, b.contact_name, b.contact_email,
           b.hire_type, b.service_type, b.start_date, b.end_date,
           v.name as vehicle_name, ve.name as vendor_name
    FROM Invoice i
    JOIN Booking b ON i.booking_id = b.id
    LEFT JOIN Vehicle v ON b.vehicle_id = v.id
    LEFT JOIN Vendor ve ON b.vendor_id = ve.id
    ORDER BY i.created_at DESC
  `)

  const serialised = invoices.map(inv => ({
    ...inv,
    created_at: inv.created_at instanceof Date ? inv.created_at.toISOString() : String(inv.created_at),
    paid_at: inv.paid_at instanceof Date ? inv.paid_at.toISOString() : inv.paid_at,
  }))

  return (
    <div className="px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Invoices</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Track and manage invoices for bookings.</p>
      </div>
      <InvoicesList invoices={serialised} />
    </div>
  )
}
