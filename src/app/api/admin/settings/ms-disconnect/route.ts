import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await prisma.setting.deleteMany({
    where: {
      key: { in: ['ms_access_token', 'ms_refresh_token', 'ms_token_expiry', 'ms_connected_email', 'ms_oauth_state'] },
    },
  })

  return NextResponse.json({ ok: true })
}
