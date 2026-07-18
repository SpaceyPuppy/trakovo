import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getDbDiagnostics } from '@/lib/db'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  return NextResponse.json({
    process_started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    diagnostics: getDbDiagnostics(),
  })
}
