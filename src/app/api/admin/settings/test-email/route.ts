import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { sendTestEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const { to, provider } = await req.json()
    if (typeof to !== 'string' || !to.trim()) return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    if (provider !== undefined && provider !== 'microsoft') return NextResponse.json({ error: 'Invalid test email provider' }, { status: 400 })
    await sendTestEmail(to.trim(), provider)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
