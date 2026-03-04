import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    await prisma.vendorVehicle.upsert({
      where: { vendor_id_vehicle_id: { vendor_id: params.id, vehicle_id } },
      create: { vendor_id: params.id, vehicle_id, is_enabled },
      update: { is_enabled },
    })
  }

  return NextResponse.json({ ok: true })
}
