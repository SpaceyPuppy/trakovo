import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ email: string; id: string }> }
) {
  const params = await props.params;
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const existing = await queryOne('SELECT id FROM CustomerNote WHERE id = ? LIMIT 1', [params.id])
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute('DELETE FROM CustomerNote WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
