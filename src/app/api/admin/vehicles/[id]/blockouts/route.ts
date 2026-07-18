import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { BookingValidationError } from '@/lib/booking-availability'
import { AdminBookingMutationError, createAdminBlockout } from '@/lib/admin-booking-mutations'

// GET /api/admin/vehicles/[id]/blockouts
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<{ id: string; start_date: string; end_date: string; reason: string; created_at: Date }>(
    'SELECT id, start_date, end_date, reason, created_at FROM VehicleBlockout WHERE vehicle_id = ? ORDER BY start_date ASC',
    [params.id]
  )
  return NextResponse.json(rows)
}

// POST /api/admin/vehicles/[id]/blockouts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AdminBookingMutationError('Invalid JSON body', 400)
    }
    const blockout = await createAdminBlockout(body, params.id)
    return NextResponse.json({
      id: blockout.id,
      start_date: blockout.start_date,
      end_date: blockout.end_date,
      reason: blockout.reason,
      created_at: blockout.created_at,
    }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AdminBookingMutationError || error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin-blockout] vehicle blockout create failed', error)
    return NextResponse.json({ error: 'Failed to create blockout' }, { status: 500 })
  }
}
