import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Context { params: { id: string } }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

    const note = await prisma.bookingNote.create({
      data: {
        booking_id: params.id,
        text: text.trim(),
        author: session.username,
      },
    })
    return NextResponse.json(note)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const notes = await prisma.bookingNote.findMany({
    where: { booking_id: params.id },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json(notes)
}
