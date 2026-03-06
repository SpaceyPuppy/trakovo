import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.username !== process.env.ADMIN_USERNAME) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await execute('DELETE FROM AdminUser WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
