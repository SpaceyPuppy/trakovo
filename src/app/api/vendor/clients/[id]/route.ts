import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne, execute } from '@/lib/db'

async function getOwnedClient(clientId: string, vendorId: string) {
  return queryOne('SELECT * FROM VendorClient WHERE id = ? AND vendor_id = ? AND is_active = 1 LIMIT 1', [clientId, vendorId])
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const client = await queryOne('SELECT * FROM VendorClient WHERE id = ? AND vendor_id = ? LIMIT 1', [params.id, session.vendorId])
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bookings = await query(
    'SELECT b.*, v.name as vehicle_name FROM Booking b LEFT JOIN Vehicle v ON b.vehicle_id = v.id WHERE b.vendor_client_id = ? ORDER BY b.created_at DESC',
    [params.id]
  )

  return NextResponse.json({ client: { ...client, is_active: Boolean((client as { is_active: number }).is_active), bookings } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const owned = await getOwnedClient(params.id, session.vendorId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'email', 'phone', 'reference', 'notes']
  const setClauses: string[] = []
  const values: unknown[] = []
  for (const key of allowed) {
    if (key in body) { setClauses.push(`${key} = ?`); values.push(body[key]) }
  }
  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(params.id)

  await execute(`UPDATE VendorClient SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`, values)
  const client = await queryOne('SELECT * FROM VendorClient WHERE id = ? LIMIT 1', [params.id])
  return NextResponse.json({ client: { ...client, is_active: Boolean((client as { is_active: number }).is_active) } })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const owned = await getOwnedClient(params.id, session.vendorId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete — preserve booking history
  await execute('UPDATE VendorClient SET is_active = 0, updated_at = NOW() WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
