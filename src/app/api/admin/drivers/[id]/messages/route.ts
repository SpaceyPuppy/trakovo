import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const messages = await prisma.driverMessage.findMany({
    where: { driver_id: params.id },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(messages)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { messageId, staff_reply, status } = await req.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const message = await prisma.driverMessage.update({
    where: { id: messageId, driver_id: params.id },
    data: {
      ...(staff_reply !== undefined && { staff_reply }),
      ...(status !== undefined && { status }),
    },
  })
  return NextResponse.json(message)
}
