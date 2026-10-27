import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const status = body?.status
  const source = body?.source ?? 'contact'
  if (!['new', 'read'].includes(status) || !['contact', 'corporate'].includes(source)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const sql = source === 'corporate' ? 'UPDATE CorporateEnquiry SET status = ? WHERE id = ?' : 'UPDATE ContactEnquiry SET status = ? WHERE id = ?'
  await execute(sql, [status, params.id])
  return NextResponse.json({ ok: true })
}
