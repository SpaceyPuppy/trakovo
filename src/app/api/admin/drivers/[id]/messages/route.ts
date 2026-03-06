import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const messages = await query(
    'SELECT * FROM DriverMessage WHERE driver_id = ? ORDER BY created_at DESC',
    [params.id]
  )
  return NextResponse.json(messages)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { messageId, staff_reply, status } = await req.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const setClauses: string[] = []
  const values: unknown[] = []
  if (staff_reply !== undefined) { setClauses.push('staff_reply = ?'); values.push(staff_reply) }
  if (status !== undefined) { setClauses.push('status = ?'); values.push(status) }
  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(messageId, params.id)

  await execute(`UPDATE DriverMessage SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ? AND driver_id = ?`, values)
  const message = await queryOne('SELECT * FROM DriverMessage WHERE id = ? LIMIT 1', [messageId])
  return NextResponse.json(message)
}
