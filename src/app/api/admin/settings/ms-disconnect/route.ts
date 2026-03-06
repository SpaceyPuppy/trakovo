import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function DELETE() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute(
    'DELETE FROM Setting WHERE `key` IN (?, ?, ?, ?, ?)',
    ['ms_access_token', 'ms_refresh_token', 'ms_token_expiry', 'ms_connected_email', 'ms_oauth_state']
  )

  return NextResponse.json({ ok: true })
}
