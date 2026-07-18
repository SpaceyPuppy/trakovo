import { getDriverSession } from '@/lib/driver-auth'
import { query } from '@/lib/db'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/ui/CalendarView'
import type { CalendarEvent } from '@/components/ui/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar' }
export const revalidate = 0

export default async function DriverCalendarPage() {
  const session = await getDriverSession()
  if (!session) redirect('/driver/login')

  const today = new Date()
  const windowStart = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 12, 1)).toISOString().slice(0, 10)
  const windowEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 25, 0)).toISOString().slice(0, 10)

  // Drivers see full operational details for their own assigned bookings only.
  const bookings = await query<{
    id: string
    public_id: string
    status: string
    start_date: string
    end_date: string
    contact_name: string | null
    vehicle_name: string | null
  }>(
    `SELECT b.id, b.public_id, b.status, b.start_date, b.end_date, b.contact_name,
            v.name as vehicle_name
     FROM Booking b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     WHERE b.driver_id = ?
       AND b.start_date <= ?
       AND b.end_date >= ?
     ORDER BY b.start_date ASC
     LIMIT 5000`,
    [session.driverId, windowEnd, windowStart]
  )

  const events: CalendarEvent[] = bookings.map(b => ({
    id: b.id,
    title: b.vehicle_name ?? 'Booking',
    subtitle: b.contact_name ?? b.public_id,
    start: b.start_date,
    end: b.end_date,
    status: b.status as CalendarEvent['status'],
    href: `/driver/bookings/${b.id}`,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-[26px] tracking-tight">Calendar</h1>
        <p className="text-[14px] text-ink-3 mt-0.5">Your assigned trips.</p>
      </div>
      <CalendarView events={events} minMonth={windowStart} maxMonth={windowEnd} />
    </div>
  )
}
