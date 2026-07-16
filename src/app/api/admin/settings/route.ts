import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getSettings, upsertSettings } from '@/lib/settings'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  return NextResponse.json(await getSettings())
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Settings must be an object' }, { status: 400 })
    }

    const updates = Object.entries(body)
    if (updates.some(([key, value]) => !key || typeof value !== 'string')) {
      return NextResponse.json({ error: 'Setting keys and values must be strings' }, { status: 400 })
    }

    await upsertSettings(updates as Array<[string, string]>)
    return NextResponse.json(await getSettings())
  } catch (error: unknown) {
    console.error('[admin/settings] Failed to update settings', error)
    return NextResponse.json({ error: 'Unable to update settings' }, { status: 500 })
  }
}
