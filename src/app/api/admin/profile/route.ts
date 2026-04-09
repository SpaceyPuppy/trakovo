import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const isMaster = session.username === process.env.ADMIN_USERNAME

  return NextResponse.json({ username: session.username, isMaster })
}
