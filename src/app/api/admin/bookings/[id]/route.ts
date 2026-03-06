import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'
import { syncBookingToCalendar, deleteCalendarEvent } from '@/lib/calendar'

interface Context { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await deleteCalendarEvent(params.id).catch(err => console.error('[calendar]', err))
    await execute('DELETE FROM Booking WHERE id = ?', [params.id])
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json()
    const { daily_rate, total_cost, driver_id } = body

    if (daily_rate === undefined && total_cost === undefined && driver_id === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const setClauses: string[] = []
    const values: unknown[] = []
    if (daily_rate !== undefined) { setClauses.push('daily_rate = ?'); values.push(Math.round(parseFloat(daily_rate) * 100)) }
    if (total_cost !== undefined) { setClauses.push('total_cost = ?'); values.push(Math.round(parseFloat(total_cost) * 100)) }
    if (driver_id !== undefined) { setClauses.push('driver_id = ?'); values.push(driver_id || null) }
    values.push(params.id)

    await execute(`UPDATE Booking SET ${setClauses.join(', ')} WHERE id = ?`, values)
    const booking = await queryOne('SELECT * FROM Booking WHERE id = ? LIMIT 1', [params.id])

    syncBookingToCalendar(params.id).catch(err => console.error('[calendar]', err))
    return NextResponse.json({ ok: true, booking })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
