import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { sendPushNotification } from '@/lib/push'

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await sendPushNotification({
    title: 'Push Notifications Active',
    body: 'Test notification from Trakovo — you\'ll be notified of new bookings.',
    url: '/admin/bookings',
  })

  return NextResponse.json({ ok: true })
}
