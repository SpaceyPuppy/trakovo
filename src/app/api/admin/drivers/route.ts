import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma, generatePublicId } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const drivers = await prisma.driver.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { bookings: true } } },
  })
  return NextResponse.json(drivers)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, username, password, email, phone } = await req.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'Name, username and password required' }, { status: 400 })
  }

  const existing = await prisma.driver.findUnique({ where: { username } })
  if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const password_hash = await hashPassword(password)
  const driver = await prisma.driver.create({
    data: {
      public_id: await generatePublicId('DRV'),
      name,
      username,
      password_hash,
      email: email ?? '',
      phone: phone ?? '',
    },
  })
  return NextResponse.json(driver, { status: 201 })
}
