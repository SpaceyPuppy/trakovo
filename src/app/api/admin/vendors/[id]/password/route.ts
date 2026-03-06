import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { new_password } = await req.json()
  if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const password_hash = await hashPassword(new_password)
  await execute('UPDATE Vendor SET password_hash = ?, updated_at = NOW() WHERE id = ?', [password_hash, params.id])

  return NextResponse.json({ ok: true })
}
