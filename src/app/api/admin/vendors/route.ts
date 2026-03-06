import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendors = await query<{
    id: string; name: string; username: string; contact_email: string;
    contact_phone: string; is_active: number; created_at: Date;
  }>('SELECT id, name, username, contact_email, contact_phone, is_active, created_at FROM Vendor ORDER BY created_at DESC')

  const result = await Promise.all(vendors.map(async (v) => {
    const [bookingCount, clientCount] = await Promise.all([
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Booking WHERE vendor_id = ?', [v.id]),
      queryOne<{ count: number }>('SELECT COUNT(*) as count FROM VendorClient WHERE vendor_id = ?', [v.id]),
    ])
    return {
      ...v,
      is_active: Boolean(v.is_active),
      _count: { bookings: bookingCount?.count ?? 0, clients: clientCount?.count ?? 0 },
    }
  }))

  return NextResponse.json({ vendors: result })
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, username, password, contact_email, contact_phone } = await req.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'name, username and password are required' }, { status: 400 })
  }

  const exists = await queryOne('SELECT id FROM Vendor WHERE username = ? LIMIT 1', [username])
  if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

  const public_id = await generatePublicId('VND')
  const password_hash = await hashPassword(password)
  const id = newId()

  await execute(
    'INSERT INTO Vendor (id, public_id, name, username, password_hash, contact_email, contact_phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, public_id, name, username, password_hash, contact_email ?? '', contact_phone ?? '']
  )

  const vendor = await queryOne('SELECT id, public_id, name, username, contact_email, contact_phone, is_active, created_at FROM Vendor WHERE id = ? LIMIT 1', [id])
  return NextResponse.json({ vendor: { ...vendor, is_active: Boolean((vendor as { is_active: number }).is_active) } }, { status: 201 })
}
