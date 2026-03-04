import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    include: {
      vehicles: { include: { vehicle: { include: { media: { take: 1, orderBy: { sort_order: 'asc' } } } } } },
      clients: { where: { is_active: true }, orderBy: { name: 'asc' } },
      bookings: {
        orderBy: { created_at: 'desc' },
        take: 20,
        include: { vehicle: { select: { name: true } }, vendor_client: { select: { name: true } } },
      },
      _count: { select: { bookings: true, clients: true } },
    },
  })

  if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ vendor })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'contact_email', 'contact_phone', 'is_active']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const vendor = await prisma.vendor.update({ where: { id: params.id }, data })
  return NextResponse.json({ vendor })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await prisma.vendor.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
