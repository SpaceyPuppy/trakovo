import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'

function isMaster(username: string) {
  return username === process.env.ADMIN_USERNAME
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!isMaster(session.username)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.adminUser.findMany({
    orderBy: { created_at: 'asc' },
    select: { id: true, username: true, created_at: true },
  })
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

  const existing = await prisma.adminUser.findUnique({ where: { username } })
  if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const password_hash = await hashPassword(password)
  const user = await prisma.adminUser.create({
    data: { username, password_hash },
    select: { id: true, username: true, created_at: true },
  })
  return NextResponse.json(user, { status: 201 })
}
