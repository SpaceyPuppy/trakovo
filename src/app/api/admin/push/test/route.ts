import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getSiteName } from '@/lib/site'
import { sendPushNotification } from '@/lib/push'

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const siteName = await getSiteName()

  await sendPushNotification({
    title: 'Push Notifications Active',
    body: `Test notification from ${siteName} — you'll be notified of new bookings.`,
    url: '/admin/bookings',
  })

  return NextResponse.json({ ok: true })
}
