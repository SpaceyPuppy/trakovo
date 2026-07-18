import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { BookingValidationError } from '@/lib/booking-availability'
import { AdminBookingMutationError, createAdminBlockout } from '@/lib/admin-booking-mutations'

// GET /api/admin/blockouts — all blockouts (global + per-vehicle) for calendar/listing
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<{
    id: string; vehicle_id: string | null; start_date: string; end_date: string;
    reason: string; created_at: Date; vehicle_name: string | null
  }>(
    `SELECT b.*, v.name as vehicle_name
     FROM VehicleBlockout b
     LEFT JOIN Vehicle v ON b.vehicle_id = v.id
     ORDER BY b.start_date ASC`
  )
  return NextResponse.json(rows)
}

// POST /api/admin/blockouts — create a blockout (vehicle_id = null means fleet-wide)
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AdminBookingMutationError('Invalid JSON body', 400)
    }
    const blockout = await createAdminBlockout(body)
    return NextResponse.json(blockout, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AdminBookingMutationError || error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin-blockout] create failed', error)
    return NextResponse.json({ error: 'Failed to create blockout' }, { status: 500 })
  }
}
