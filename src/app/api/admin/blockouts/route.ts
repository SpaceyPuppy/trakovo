import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute, newId } from '@/lib/db'

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

  const { start_date, end_date, reason, vehicle_id } = await req.json()
  if (!start_date || !end_date) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }
  if (start_date > end_date) {
    return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
  }

  const id = newId()
  await execute(
    'INSERT INTO VehicleBlockout (id, vehicle_id, start_date, end_date, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [id, vehicle_id ?? null, start_date, end_date, reason ?? '']
  )
  const rows = await query<{ id: string; vehicle_id: string | null; start_date: string; end_date: string; reason: string; created_at: Date; vehicle_name: string | null }>(
    `SELECT b.*, v.name as vehicle_name FROM VehicleBlockout b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.id = ? LIMIT 1`,
    [id]
  )
  return NextResponse.json(rows[0], { status: 201 })
}
