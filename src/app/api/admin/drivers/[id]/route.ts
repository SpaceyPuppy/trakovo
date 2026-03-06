import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        orderBy: { start_date: 'desc' },
        take: 20,
        include: { vehicle: { select: { name: true } } },
      },
      messages: { orderBy: { created_at: 'desc' } },
    },
  })
  if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(driver)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, email, phone, is_active } = await req.json()
  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(is_active !== undefined && { is_active }),
    },
  })
  return NextResponse.json(driver)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await prisma.driver.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
