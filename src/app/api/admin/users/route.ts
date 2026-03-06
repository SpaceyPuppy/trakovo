import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute, newId } from '@/lib/db'
import { hashPassword } from '@/lib/password'

function isMaster(username: string) {
  return username === process.env.ADMIN_USERNAME
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!isMaster(session.username)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await query<{ id: string; username: string; created_at: Date }>(
    'SELECT id, username, created_at FROM AdminUser ORDER BY created_at ASC'
  )
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!isMaster(session.username)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }
  if (username === process.env.ADMIN_USERNAME) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
  }

  const existing = await queryOne('SELECT id FROM AdminUser WHERE username = ? LIMIT 1', [username])
  if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const id = newId()
  const password_hash = await hashPassword(password)
  await execute('INSERT INTO AdminUser (id, username, password_hash, created_at) VALUES (?, ?, ?, NOW())', [id, username, password_hash])
  const user = await queryOne<{ id: string; username: string; created_at: Date }>(
    'SELECT id, username, created_at FROM AdminUser WHERE id = ? LIMIT 1', [id]
  )
  return NextResponse.json(user, { status: 201 })
}
