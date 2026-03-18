import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const existing = await queryOne('SELECT id FROM VehicleBlockout WHERE id = ? LIMIT 1', [params.id])
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute('DELETE FROM VehicleBlockout WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
