import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

// PUT /api/admin/vendors/[id]/vehicles
// Body: { assignments: { vehicle_id: string, is_enabled: boolean }[] }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { assignments } = await req.json() as {
    assignments: { vehicle_id: string; is_enabled: boolean }[]
  }

  if (!Array.isArray(assignments)) {
    return NextResponse.json({ error: 'assignments must be an array' }, { status: 400 })
  }

  for (const { vehicle_id, is_enabled } of assignments) {
    await execute(
      'INSERT INTO VendorVehicle (vendor_id, vehicle_id, is_enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)',
      [params.id, vehicle_id, is_enabled ? 1 : 0]
    )
  }

  return NextResponse.json({ ok: true })
}
