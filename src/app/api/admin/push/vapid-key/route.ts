import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null
  return NextResponse.json({ publicKey })
}
