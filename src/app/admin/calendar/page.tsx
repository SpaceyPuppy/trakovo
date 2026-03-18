import { adminGetBookings } from '@/lib/api'
import { query } from '@/lib/db'
import CalendarView from '@/components/ui/CalendarView'
import type { CalendarEvent } from '@/components/ui/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar' }
export const revalidate = 0

export default async function AdminCalendarPage() {
  let bookings: Awaited<ReturnType<typeof adminGetBookings>> = []
  try { bookings = await adminGetBookings() } catch { /* show empty */ }

  let blockouts: { id: string; vehicle_id: string | null; start_date: string; end_date: string; reason: string; vehicle_name: string | null }[] = []
  try {
    blockouts = await query(
      `SELECT b.id, b.vehicle_id, b.start_date, b.end_date, b.reason, v.name as vehicle_name
       FROM VehicleBlockout b LEFT JOIN Vehicle v ON b.vehicle_id = v.id`
    )
  } catch { /* show without blockouts */ }

  const bookingEvents: CalendarEvent[] = bookings.map(b => ({
    id: b.id,
    title: b.vehicle?.name ?? (b.service_type === 'taxi' ? 'Taxi' : b.service_type === 'cpv' ? 'CPV' : 'Booking'),
    subtitle: b.contact_name || b.public_id,
    start: b.start_date,
    end: b.end_date,
    status: b.status,
    href: `/admin/bookings/${b.id}`,
  }))

  const blockoutEvents: CalendarEvent[] = blockouts.map(b => ({
    id: `blockout-${b.id}`,
    title: b.vehicle_id ? `Blocked — ${b.vehicle_name ?? 'Vehicle'}` : 'Fleet Closed',
    subtitle: b.reason || undefined,
    start: b.start_date,
    end: b.end_date,
    status: 'blockout',
  }))

  const events: CalendarEvent[] = [...bookingEvents, ...blockoutEvents]

  return (
    <div className="px-4 sm:px-10 py-8 md:py-10">
      <h1 className="font-display font-bold text-[26px] tracking-tight mb-1">Calendar</h1>
      <p className="text-[14px] text-ink-3 mb-8">All bookings and blocked dates. Hover an event to see details.</p>
      <CalendarView events={events} />
    </div>
  )
}
