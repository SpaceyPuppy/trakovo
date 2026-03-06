import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

  const password_hash = await hashPassword(password)
  await execute('UPDATE Driver SET password_hash = ?, updated_at = NOW() WHERE id = ?', [password_hash, params.id])
  return NextResponse.json({ ok: true })
}
