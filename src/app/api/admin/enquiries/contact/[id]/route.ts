import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { status } = await req.json()
  if (!['new', 'read'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await execute('UPDATE ContactEnquiry SET status = ? WHERE id = ?', [status, params.id])
  return NextResponse.json({ ok: true })
}
