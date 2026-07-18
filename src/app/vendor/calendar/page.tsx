import { getVendorSession } from '@/lib/vendor-auth'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/ui/CalendarView'
import type { CalendarEvent } from '@/components/ui/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar' }
export const revalidate = 0

export default async function VendorCalendarPage() {
  const session = await getVendorSession()
  if (!session) redirect('/vendor/login')

  const today = new Date()
  const windowStart = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 12, 1)).toISOString().slice(0, 10)
  const windowEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 25, 0)).toISOString().slice(0, 10)

  // Deliberately select only non-PII fields from Booking.
  // vendor_client_name is the vendor's own customer name (entered by the vendor) — safe to show.
  // contact_name / contact_email / contact_phone are NOT selected.
  const bookings = await query<{
    id: string
    public_id: string
    status: string
    start_date: string
    end_date: string
    service_type: string
    vehicle_name: string | null
    vendor_client_name: string | null
  }>(
    `SELECT b.id, b.public_id, b.status, b.start_date, b.end_date, b.service_type,
            v.name as vehicle_name, vc.name as vendor_client_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     LEFT JOIN VendorClient vc ON b.vendor_client_id = vc.id
     WHERE b.vendor_id = ?
       AND b.start_date <= ?
       AND b.end_date >= ?
     ORDER BY b.start_date ASC
     LIMIT 5000`,
    [session.vendorId, windowEnd, windowStart]
  )

  const events: CalendarEvent[] = bookings.map(b => ({
    id: b.id,
    title: b.vehicle_name ?? (b.service_type === 'taxi' ? 'Taxi' : b.service_type === 'cpv' ? 'CPV' : 'Booking'),
    subtitle: b.vendor_client_name ?? b.public_id,
    start: b.start_date,
    end: b.end_date,
    status: b.status as CalendarEvent['status'],
    href: `/vendor/bookings/${b.id}`,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Calendar</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Your booking schedule.</p>
      </div>
      <CalendarView events={events} minMonth={windowStart} maxMonth={windowEnd} />
    </div>
  )
}
