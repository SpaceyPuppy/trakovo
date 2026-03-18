import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { email: string; alias: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute('DELETE FROM CustomerAlias WHERE id = ?', [params.alias])
  return NextResponse.json({ ok: true })
}
