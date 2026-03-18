import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute, newId } from '@/lib/db'

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

  const { start_date, end_date, reason } = await req.json()
  if (!start_date || !end_date) {
    return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
  }
  if (start_date > end_date) {
    return NextResponse.json({ error: 'start_date must be before end_date' }, { status: 400 })
  }

  const id = newId()
  await execute(
    'INSERT INTO VehicleBlockout (id, vehicle_id, start_date, end_date, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [id, params.id, start_date, end_date, reason ?? '']
  )
  const rows = await query<{ id: string; start_date: string; end_date: string; reason: string; created_at: Date }>(
    'SELECT id, start_date, end_date, reason, created_at FROM VehicleBlockout WHERE id = ? LIMIT 1', [id]
  )
  return NextResponse.json(rows[0], { status: 201 })
}
