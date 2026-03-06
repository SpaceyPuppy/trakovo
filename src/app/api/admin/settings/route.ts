import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query, execute } from '@/lib/db'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await query<{ key: string; value: string }>('SELECT `key`, value FROM Setting')
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.key] = row.value

  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = await req.json() as Record<string, string>
    const updates = Object.entries(body)

    await Promise.all(
      updates.map(([key, value]) =>
        execute(
          'INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
          [key, value]
        )
      )
    )

    const rows = await query<{ key: string; value: string }>('SELECT `key`, value FROM Setting')
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value

    return NextResponse.json(settings)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
