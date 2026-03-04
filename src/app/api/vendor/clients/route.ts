import { NextResponse } from 'next/server'
import { getVendorSession } from '@/lib/vendor-auth'
import { prisma, generatePublicId } from '@/lib/db'

export async function GET() {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clients = await prisma.vendorClient.findMany({
    where: { vendor_id: session.vendorId, is_active: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { bookings: true } } },
  })

  return NextResponse.json({ clients })
}

export async function POST(req: Request) {
  const session = await getVendorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, email, phone, reference, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const public_id = await generatePublicId('VNC')

  const client = await prisma.vendorClient.create({
    data: {
      public_id,
      vendor_id: session.vendorId,
      name,
      email: email ?? '',
      phone: phone ?? '',
      reference: reference ?? '',
      notes: notes ?? '',
    },
  })

  return NextResponse.json({ client }, { status: 201 })
}
