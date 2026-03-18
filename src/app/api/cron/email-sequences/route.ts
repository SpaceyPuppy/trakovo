import { NextRequest, NextResponse } from 'next/server'
import { sendDue24hrReminders, sendFollowups } from '@/lib/email-sequences'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [reminders, followups] = await Promise.all([
    sendDue24hrReminders(),
    sendFollowups(),
  ])

  return NextResponse.json({
    ok: true,
    reminders,
    followups,
    ran_at: new Date().toISOString(),
  })
}
