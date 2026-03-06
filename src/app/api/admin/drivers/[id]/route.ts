import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const driver = await queryOne<{ id: string; name: string; is_active: number }>(
    'SELECT id, public_id, name, username, email, phone, is_active, created_at FROM Driver WHERE id = ? LIMIT 1',
    [params.id]
  )
  if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [bookings, messages] = await Promise.all([
    query(
      'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.driver_id = ? ORDER BY b.start_date DESC LIMIT 20',
      [params.id]
    ),
    query('SELECT * FROM DriverMessage WHERE driver_id = ? ORDER BY created_at DESC', [params.id]),
  ])

  return NextResponse.json({ ...driver, is_active: Boolean(driver.is_active), bookings, messages })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, email, phone, is_active } = await req.json()
  const setClauses: string[] = []
  const values: unknown[] = []
  if (name !== undefined) { setClauses.push('name = ?'); values.push(name) }
  if (email !== undefined) { setClauses.push('email = ?'); values.push(email) }
  if (phone !== undefined) { setClauses.push('phone = ?'); values.push(phone) }
  if (is_active !== undefined) { setClauses.push('is_active = ?'); values.push(is_active ? 1 : 0) }
  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(params.id)

  await execute(`UPDATE Driver SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`, values)
  const driver = await queryOne<{ is_active: number }>('SELECT id, public_id, name, username, email, phone, is_active, created_at FROM Driver WHERE id = ? LIMIT 1', [params.id])
  return NextResponse.json({ ...driver, is_active: Boolean(driver?.is_active) })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute('DELETE FROM Driver WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
