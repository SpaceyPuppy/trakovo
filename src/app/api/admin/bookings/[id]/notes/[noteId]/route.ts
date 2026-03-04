import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Context { params: { id: string; noteId: string } }

export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await prisma.bookingNote.delete({ where: { id: params.noteId, booking_id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
