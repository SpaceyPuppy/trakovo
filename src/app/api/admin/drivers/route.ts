import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute, newId, generatePublicId } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { listDriverSummaries } from '@/lib/repositories/drivers'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  return NextResponse.json(await listDriverSummaries())
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, username, password, email, phone } = await req.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'Name, username and password required' }, { status: 400 })
  }

  const existing = await queryOne('SELECT id FROM Driver WHERE username = ? LIMIT 1', [username])
  if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const password_hash = await hashPassword(password)
  const id = newId()
  const public_id = await generatePublicId('DRV')
  await execute(
    'INSERT INTO Driver (id, public_id, name, username, password_hash, email, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, public_id, name, username, password_hash, email ?? '', phone ?? '']
  )
  const driver = await queryOne('SELECT id, public_id, name, username, email, phone, is_active, created_at FROM Driver WHERE id = ? LIMIT 1', [id])
  return NextResponse.json({ ...driver, is_active: Boolean((driver as { is_active: number }).is_active) }, { status: 201 })
}
