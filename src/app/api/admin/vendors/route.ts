import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { listVendorSummaries } from '@/lib/repositories/vendors'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendors = await listVendorSummaries('created_at_desc')
  const result = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    username: vendor.username,
    contact_email: vendor.contact_email,
    contact_phone: vendor.contact_phone,
    is_active: vendor.is_active,
    created_at: vendor.created_at,
    _count: vendor._count,
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
