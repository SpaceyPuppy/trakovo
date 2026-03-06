import webpush from 'web-push'
import { query, execute } from './db'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendPushNotification(payload: {
  title: string
  body: string
  url?: string
  icon?: string
}) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
    'SELECT endpoint, p256dh, auth FROM PushSubscription'
  )
  if (subs.length === 0) return

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async (err: { statusCode?: number }) => {
          // Remove expired or invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            await execute('DELETE FROM PushSubscription WHERE endpoint = ?', [sub.endpoint]).catch(() => {})
          }
        })
    )
  )
}
