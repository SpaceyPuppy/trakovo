import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clients = await query<{ id: string; name: string; is_active: number }>(
    'SELECT * FROM VendorClient WHERE vendor_id = ? AND is_active = 1 ORDER BY name ASC',
    [session.vendorId]
  )

  const result = await Promise.all(clients.map(async (c) => {
    const count = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE vendor_client_id = ?', [c.id])
    return { ...c, is_active: Boolean(c.is_active), _count: { bookings: count?.count ?? 0 } }
  }))

  return NextResponse.json({ clients: result })
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, email, phone, reference, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const public_id = await generatePublicId('VNC')
  const id = newId()

  await execute(
    'INSERT INTO VendorClient (id, public_id, vendor_id, name, email, phone, reference, notes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, public_id, session.vendorId, name, email ?? '', phone ?? '', reference ?? '', notes ?? '']
  )

  const client = await queryOne('SELECT * FROM VendorClient WHERE id = ? LIMIT 1', [id])
  return NextResponse.json({ client: { ...client, is_active: Boolean((client as { is_active: number }).is_active) } }, { status: 201 })
}
