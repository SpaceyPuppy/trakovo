import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { execute } from '@/lib/db'

export async function DELETE() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await execute(
    'DELETE FROM Setting WHERE `key` IN (?, ?, ?, ?, ?, ?)',
    ['gc_access_token', 'gc_refresh_token', 'gc_token_expiry', 'gc_connected_email', 'gc_calendar_id', 'gc_oauth_state']
  )

  return NextResponse.json({ ok: true })
}
