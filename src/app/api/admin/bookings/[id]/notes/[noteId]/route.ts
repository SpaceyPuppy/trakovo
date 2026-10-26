import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

interface Context { params: Promise<{ id: string; noteId: string }> }

export async function DELETE(_req: NextRequest, props: Context) {
  const params = await props.params;
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await execute('DELETE FROM BookingNote WHERE id = ? AND booking_id = ?', [params.noteId, params.id])
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
