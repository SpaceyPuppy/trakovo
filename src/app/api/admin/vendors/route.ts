import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma, generatePublicId } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendors = await prisma.vendor.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { bookings: true, clients: true } },
    },
  })

  return NextResponse.json({ vendors })
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, username, password, contact_email, contact_phone } = await req.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'name, username and password are required' }, { status: 400 })
  }

  const exists = await prisma.vendor.findUnique({ where: { username } })
  if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

  const public_id = await generatePublicId('VND')
  const password_hash = await hashPassword(password)

  const vendor = await prisma.vendor.create({
    data: {
      public_id,
      name,
      username,
      password_hash,
      contact_email: contact_email ?? '',
      contact_phone: contact_phone ?? '',
    },
  })

  return NextResponse.json({ vendor }, { status: 201 })
}
