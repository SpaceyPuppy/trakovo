import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute, newId } from '@/lib/db'

interface Context { params: { id: string } }

export async function POST(req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

    const id = newId()
    await execute(
      'INSERT INTO BookingNote (id, booking_id, text, author, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, params.id, text.trim(), session.username]
    )
    const note = await query('SELECT * FROM BookingNote WHERE id = ? LIMIT 1', [id])
    return NextResponse.json(note[0])
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const notes = await query(
    'SELECT * FROM BookingNote WHERE booking_id = ? ORDER BY created_at ASC',
    [params.id]
  )
  return NextResponse.json(notes)
}
