import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { syncBookingToCalendar, deleteCalendarEvent } from '@/lib/calendar'
import { sendBookingConfirmed } from '@/lib/email-sequences'

interface Context { params: { id: string } }

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'enquiry']

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const { status } = await req.json()
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    await execute('UPDATE Booking SET status = ? WHERE id = ?', [status, params.id])
    const booking = await queryOne('SELECT * FROM Booking WHERE id = ? LIMIT 1', [params.id])

    if (status === 'cancelled') {
      deleteCalendarEvent(params.id).catch(err => console.error('[calendar]', err))
    } else {
      syncBookingToCalendar(params.id).catch(err => console.error('[calendar]', err))
    }

    if (status === 'confirmed') {
      sendBookingConfirmed(params.id).catch(err => console.error('[email-seq] confirmed', err))
    }

    return NextResponse.json(booking)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
