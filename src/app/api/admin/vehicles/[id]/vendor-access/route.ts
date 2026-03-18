import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute } from '@/lib/db'

interface Context { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const rows = await query<{ id: string; name: string; vv_id: number | null; is_enabled: number | null }>(
      `SELECT v.id, v.name, vv.id as vv_id, vv.is_enabled
       FROM Vendor v
       LEFT JOIN VendorVehicle vv ON vv.vendor_id = v.id AND vv.vehicle_id = ?
       WHERE v.is_active = 1
       ORDER BY v.name ASC`,
      [params.id]
    )
    return NextResponse.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      has_access: r.vv_id !== null && Boolean(r.is_enabled),
    })))
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const { vendor_id } = await req.json()
    if (!vendor_id) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
    await execute(
      `INSERT INTO VendorVehicle (vendor_id, vehicle_id, is_enabled, created_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_enabled = 1`,
      [vendor_id, params.id]
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const { vendor_id } = await req.json()
    if (!vendor_id) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
    await execute(
      'DELETE FROM VendorVehicle WHERE vendor_id = ? AND vehicle_id = ?',
      [vendor_id, params.id]
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
