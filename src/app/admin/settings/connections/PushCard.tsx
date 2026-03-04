'use client'
import { useState, useEffect } from 'react'

interface Props {
  pushConfigured: boolean
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'idle' | 'subscribed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)))
}

export default function PushCard({ pushConfigured }: Props) {
  const [state, setState] = useState<PushState>('loading')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  useEffect(() => {
    if (!pushConfigured) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    // Register SW (or get existing registration) then check subscription status
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'subscribed' : 'idle'))
      .catch(() => setState('idle'))
  }, [pushConfigured])

  async function handleSubscribe() {
    setSaving(true)
    try {
      // Fetch VAPID public key
      const keyRes = await fetch('/api/admin/push/vapid-key')
      const { publicKey } = await keyRes.json()
      if (!publicKey) throw new Error('VAPID key not available')

      // Register service worker (resolves immediately if already registered)
      const reg = await navigator.serviceWorker.register('/sw.js')

      // Request permission + subscribe
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        flash('Notification permission was denied', 'error')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      setState('subscribed')
      flash('Push notifications enabled on this device', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Failed to subscribe', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnsubscribe() {
    setSaving(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/admin/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('idle')
      flash('Push notifications disabled on this device', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Failed to unsubscribe', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/push/test', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Send failed')
      flash('Test notification sent!', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">Push Notifications</h3>
        <p className="text-[12.5px] text-ink-3 mt-0.5">
          Get instant browser notifications on your phone or desktop when a new booking comes in.
        </p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {message && (
          <p className={`text-[13px] rounded-[6px] px-3 py-2 ${message.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>
            {message.text}
          </p>
        )}

        {!pushConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] px-4 py-3 text-[13px] text-yellow-700">
            Add <code className="font-mono text-[12px]">VAPID_PUBLIC_KEY</code>, <code className="font-mono text-[12px]">VAPID_PRIVATE_KEY</code>, and <code className="font-mono text-[12px]">VAPID_SUBJECT</code> to your <code className="font-mono text-[12px]">.env.local</code> to enable this. Generate keys with: <code className="font-mono text-[12px]">npx web-push generate-vapid-keys</code>
          </div>
        ) : state === 'loading' ? (
          <p className="text-[13px] text-ink-3">Checking subscription status…</p>
        ) : state === 'unsupported' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] px-4 py-3 text-[13px] text-yellow-700">
            Web Push is not supported in this browser. Try Chrome, Edge, or Firefox.
          </div>
        ) : state === 'denied' ? (
          <div className="bg-red-50 border border-red-200 rounded-[6px] px-4 py-3 text-[13px] text-red-700">
            Notification permission was denied. To re-enable, click the lock icon in your browser&apos;s address bar and allow notifications for this site.
          </div>
        ) : state === 'subscribed' ? (
          <div className="space-y-3">
            <div className="bg-success-bg border border-success/30 rounded-[6px] px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-success font-semibold">Enabled on this device</p>
                <p className="text-[12px] text-ink-3 mt-0.5">You&apos;ll receive a push notification for every new booking.</p>
              </div>
              <button
                onClick={handleUnsubscribe}
                disabled={saving}
                className="text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-[5px] transition-colors disabled:opacity-50 whitespace-nowrap">
                {saving ? 'Disabling…' : 'Disable'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={testing}
                className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all disabled:opacity-40">
                {testing ? 'Sending…' : 'Send Test Notification'}
              </button>
              <p className="text-[12px] text-ink-4">Other staff can subscribe from their own devices.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">
              Subscribe on this device to receive instant push notifications when new bookings arrive. Each staff member subscribes separately from their own device.
            </p>
            <button
              onClick={handleSubscribe}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-4 py-2.5 rounded-[6px] transition-colors disabled:opacity-50">
              {saving ? 'Enabling…' : 'Enable on this device'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
