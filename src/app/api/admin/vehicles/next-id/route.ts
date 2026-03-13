import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { generatePublicId } from '@/lib/db'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const public_id = await generatePublicId('VHC')
  return NextResponse.json({ public_id })
}
