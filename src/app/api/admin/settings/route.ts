import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await prisma.setting.findMany()
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
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    )

    const rows = await prisma.setting.findMany()
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value

    return NextResponse.json(settings)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
