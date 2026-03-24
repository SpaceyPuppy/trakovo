import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = params
  const body = await req.json() as { is_enabled?: boolean; config?: Record<string, unknown> }

  const existing = await queryOne<{ id: string }>('SELECT id FROM ServiceFeature WHERE id = ?', [id])
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.is_enabled !== undefined) {
    await execute('UPDATE ServiceFeature SET is_enabled = ? WHERE id = ?', [body.is_enabled ? 1 : 0, id])
  }
  if (body.config !== undefined) {
    await execute('UPDATE ServiceFeature SET config = ? WHERE id = ?', [JSON.stringify(body.config), id])
  }

  return NextResponse.json({ ok: true })
}
