import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = decodeURIComponent(params.email)
  await execute(
    'INSERT IGNORE INTO CustomerArchive (email, created_at) VALUES (?, NOW())',
    [email]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = decodeURIComponent(params.email)
  await execute('DELETE FROM CustomerArchive WHERE email = ?', [email])
  return NextResponse.json({ ok: true })
}
