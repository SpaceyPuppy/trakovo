import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute } from '@/lib/db'
import { sendSms } from '@/lib/sms'

const KEYS = ['crazytel_enabled', 'crazytel_api_key', 'crazytel_from_number', 'crazytel_dispatch_number']

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM Setting WHERE \`key\` IN (${KEYS.map(() => '?').join(',')})`,
    KEYS
  )
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key] = r.value

  return NextResponse.json({
    enabled: s.crazytel_enabled === '1',
    api_key_set: Boolean(s.crazytel_api_key),
    from_number: s.crazytel_from_number ?? '',
    dispatch_number: s.crazytel_dispatch_number ?? '',
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const updates: Array<[string, string]> = []

  if (body.enabled !== undefined) updates.push(['crazytel_enabled', body.enabled ? '1' : '0'])
  if (body.api_key) updates.push(['crazytel_api_key', body.api_key])
  if (body.from_number !== undefined) updates.push(['crazytel_from_number', body.from_number])
  if (body.dispatch_number !== undefined) updates.push(['crazytel_dispatch_number', body.dispatch_number])

  for (const [key, value] of updates) {
    await execute(
      'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
      [key, value]
    )
  }

  return NextResponse.json({ ok: true })
}

// POST — send test SMS
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { to } = await req.json()
  if (!to) return NextResponse.json({ error: 'Missing to number' }, { status: 400 })

  const result = await sendSms(to, 'This is a test SMS from Trakovo. Your CrazyTel SMS integration is working correctly.')
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
