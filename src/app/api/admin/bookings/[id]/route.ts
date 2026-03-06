import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncBookingToCalendar, deleteCalendarEvent } from '@/lib/calendar'

interface Context { params: { id: string } }

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await deleteCalendarEvent(params.id).catch(err => console.error('[calendar]', err))
    await prisma.booking.delete({ where: { id: params.id } })
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

    const data: Record<string, number | string | null> = {}
    if (daily_rate !== undefined) data.daily_rate = Math.round(parseFloat(daily_rate) * 100)
    if (total_cost !== undefined) data.total_cost = Math.round(parseFloat(total_cost) * 100)
    if (driver_id !== undefined) data.driver_id = driver_id || null

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data,
    })

    syncBookingToCalendar(params.id).catch(err => console.error('[calendar]', err))
    return NextResponse.json({ ok: true, booking })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
