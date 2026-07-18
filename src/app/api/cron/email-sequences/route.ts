import { NextRequest, NextResponse } from 'next/server'
import { sendDue24hrReminders, sendFollowups } from '@/lib/email-sequences'
import { execute } from '@/lib/db'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [reminders, followups, idempotencyCleanup] = await Promise.all([
    sendDue24hrReminders(),
    sendFollowups(),
    execute('DELETE FROM RequestIdempotency WHERE expires_at < NOW() LIMIT 1000')
      .then(() => true)
      .catch(error => {
        console.error('[cron] Idempotency cleanup failed', error)
        return false
      }),
  ])

  return NextResponse.json({
    ok: true,
    reminders,
    followups,
    idempotency_cleanup: idempotencyCleanup,
    ran_at: new Date().toISOString(),
  })
}
