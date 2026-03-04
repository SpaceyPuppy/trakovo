import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma } from '@/lib/db'

async function getOwnedClient(clientId: string, vendorId: string) {
  return prisma.vendorClient.findFirst({
    where: { id: clientId, vendor_id: vendorId, is_active: true },
  })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const client = await prisma.vendorClient.findFirst({
    where: { id: params.id, vendor_id: session.vendorId },
    include: {
      bookings: {
        orderBy: { created_at: 'desc' },
        include: { vehicle: { select: { name: true } } },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ client })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const owned = await getOwnedClient(params.id, session.vendorId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'email', 'phone', 'reference', 'notes']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const client = await prisma.vendorClient.update({ where: { id: params.id }, data })
  return NextResponse.json({ client })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const owned = await getOwnedClient(params.id, session.vendorId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete — preserve booking history
  await prisma.vendorClient.update({ where: { id: params.id }, data: { is_active: false } })
  return NextResponse.json({ ok: true })
}
