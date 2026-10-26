import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ email: string; alias: string }> }
) {
  const params = await props.params;
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute('DELETE FROM CustomerAlias WHERE id = ?', [params.alias])
  return NextResponse.json({ ok: true })
}
