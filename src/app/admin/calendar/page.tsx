import { adminGetBookings } from '@/lib/api'
import CalendarView from '@/components/ui/CalendarView'
import type { CalendarEvent } from '@/components/ui/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar' }
export const revalidate = 0

export default async function AdminCalendarPage() {
  let bookings: Awaited<ReturnType<typeof adminGetBookings>> = []
  try { bookings = await adminGetBookings() } catch { /* show empty */ }

  const events: CalendarEvent[] = bookings.map(b => ({
    id: b.id,
    // subtitle holds contact_name — PII visible only to admins via tooltip hover
    title: b.vehicle?.name ?? (b.service_type === 'taxi' ? 'Taxi' : b.service_type === 'cpv' ? 'CPV' : 'Booking'),
    subtitle: b.contact_name || b.public_id,
    start: b.start_date,
    end: b.end_date,
    status: b.status,
    href: `/admin/bookings/${b.id}`,
  }))

  return (
    <div className="px-4 sm:px-10 py-8 md:py-10">
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Calendar</h1>
      <p className="text-[14px] text-ink-3 mb-8">All bookings overview. Hover an event to see the customer name.</p>
      <CalendarView events={events} />
    </div>
  )
}
