import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/password'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const isMaster = session.username === process.env.ADMIN_USERNAME
  if (isMaster) {
    return NextResponse.json({ error: 'Master admin password is managed via environment variables' }, { status: 403 })
  }

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
  }

  const user = await queryOne<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM AdminUser WHERE username = ? LIMIT 1',
    [session.username]
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await verifyPassword(currentPassword, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const newHash = await hashPassword(newPassword)
  await execute('UPDATE AdminUser SET password_hash = ? WHERE id = ?', [newHash, user.id])

  return NextResponse.json({ ok: true })
}
