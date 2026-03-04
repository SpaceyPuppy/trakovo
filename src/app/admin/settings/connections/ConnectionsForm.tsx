'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  smtpConfigured: boolean
  smtpVars: Record<string, boolean>
  msConfigured: boolean
  msConnected: boolean
  msConnectedEmail: string
  gcConfigured: boolean
  gcConnected: boolean
  gcConnectedEmail: string
}

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-bg">
        <h3 className="font-display font-bold text-[14px]">{title}</h3>
        {description && <p className="text-[12.5px] text-ink-3 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

export default function ConnectionsForm({
  smtpConfigured, smtpVars,
  msConfigured, msConnected: msConnectedProp, msConnectedEmail: msConnectedEmailProp,
  gcConfigured, gcConnected: gcConnectedProp, gcConnectedEmail: gcConnectedEmailProp,
}: Props) {
  const searchParams = useSearchParams()
  const [msConnected, setMsConnected] = useState(msConnectedProp)
  const [msConnectedEmail, setMsConnectedEmail] = useState(msConnectedEmailProp)
  const [gcConnected, setGcConnected] = useState(gcConnectedProp)
  const [gcConnectedEmail, setGcConnectedEmail] = useState(gcConnectedEmailProp)
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  async function handleTestEmail() {
    if (!testEmail) return
    setSaving('test')
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Send failed')
      flash('Test email sent!', 'success')
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error')
    } finally { setSaving(null) }
  }

  async function handleMsDisconnect() {
    setSaving('ms')
    try {
      await fetch('/api/admin/settings/ms-disconnect', { method: 'DELETE' })
      setMsConnected(false)
      setMsConnectedEmail('')
      flash('Microsoft 365 disconnected', 'success')
    } catch {
      flash('Disconnect failed', 'error')
    } finally { setSaving(null) }
  }

  async function handleGcDisconnect() {
    setSaving('gc')
    try {
      await fetch('/api/admin/settings/gc-disconnect', { method: 'DELETE' })
      setGcConnected(false)
      setGcConnectedEmail('')
      flash('Google Calendar disconnected', 'success')
    } catch {
      flash('Disconnect failed', 'error')
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-6">
      {searchParams.get('ms') === 'connected' && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">
          Microsoft 365 connected successfully — emails will now be sent from your Outlook account.
        </p>
      )}
      {searchParams.get('gc') === 'connected' && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">
          Google Calendar connected successfully — new bookings will now sync automatically.
        </p>
      )}
      {searchParams.get('error') && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">
          Connection failed ({searchParams.get('error')}). Please try again.
        </p>
      )}
      {success && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">{success}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
      )}

      {/* Microsoft 365 */}
      <Card title="Microsoft 365 Email" description="Send emails directly from your Outlook mailbox using OAuth — no SMTP password needed.">
        {!msConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] px-4 py-3 text-[13px] text-yellow-700">
            Add <code className="font-mono text-[12px]">MS_CLIENT_ID</code>, <code className="font-mono text-[12px]">MS_CLIENT_SECRET</code>, and <code className="font-mono text-[12px]">MS_TENANT_ID</code> to your <code className="font-mono text-[12px]">.env.local</code> to enable this.
          </div>
        ) : msConnected ? (
          <div className="space-y-3">
            <div className="bg-success-bg border border-success/30 rounded-[6px] px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-success font-semibold">Connected</p>
                <p className="text-[12px] text-ink-3 mt-0.5">Sending as: <span className="font-medium text-ink">{msConnectedEmail}</span></p>
              </div>
              <button
                onClick={handleMsDisconnect}
                disabled={saving === 'ms'}
                className="text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-[5px] transition-colors disabled:opacity-50 whitespace-nowrap">
                {saving === 'ms' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
            <p className="text-[12px] text-ink-4">Microsoft 365 is active. Outgoing emails use your Outlook account — SMTP is ignored while connected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">Connect your Microsoft 365 account to send booking notifications and customer emails directly from Outlook.</p>
            <a
              href="/api/admin/settings/ms-auth"
              className="inline-flex items-center gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-[13px] px-4 py-2.5 rounded-[6px] transition-colors">
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
              </svg>
              Connect with Microsoft
            </a>
          </div>
        )}
      </Card>

      {/* Google Calendar */}
      <Card title="Google Calendar" description="Sync bookings to Google Calendar for staff scheduling visibility. Colour-coded by status.">
        {!gcConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] px-4 py-3 text-[13px] text-yellow-700">
            Add <code className="font-mono text-[12px]">GC_CLIENT_ID</code> and <code className="font-mono text-[12px]">GC_CLIENT_SECRET</code> to your <code className="font-mono text-[12px]">.env.local</code> to enable this.
          </div>
        ) : gcConnected ? (
          <div className="space-y-3">
            <div className="bg-success-bg border border-success/30 rounded-[6px] px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-success font-semibold">Connected</p>
                <p className="text-[12px] text-ink-3 mt-0.5">Syncing as: <span className="font-medium text-ink">{gcConnectedEmail}</span></p>
              </div>
              <button
                onClick={handleGcDisconnect}
                disabled={saving === 'gc'}
                className="text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-[5px] transition-colors disabled:opacity-50 whitespace-nowrap">
                {saving === 'gc' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
            <p className="text-[12px] text-ink-4">New bookings appear automatically. Colour-coded: yellow = pending, green = confirmed, red = cancelled, navy = completed, purple = enquiry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">Connect your Google account to sync bookings to Google Calendar automatically.</p>
            <a
              href="/api/admin/settings/gc-auth"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[13px] px-4 py-2.5 rounded-[6px] border border-gray-300 shadow-sm transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect with Google
            </a>
          </div>
        )}
      </Card>

      {/* SMTP Fallback */}
      <Card title="SMTP Fallback" description="Used when Microsoft 365 is not connected. Configure via environment variables in .env.local.">
        <div className={cn('rounded-[6px] px-4 py-3 text-[13px]', smtpConfigured ? 'bg-success-bg border border-success/30 text-success' : 'bg-yellow-50 border border-yellow-200 text-yellow-700')}>
          {smtpConfigured ? 'SMTP is configured and ready as a fallback.' : 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env.local file.'}
        </div>
        <div className="bg-bg border border-border rounded-[6px] px-4 py-3 font-mono text-[12px] text-ink-3 space-y-1">
          {['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_FROM'].map((k) => (
            <div key={k}><span className="text-ink-2">{k}</span> = {smtpVars[k] ? '••••••' : <em className="text-red-400">not set</em>}</div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            className={cn(inp, 'flex-1')}
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@email.com"
          />
          <button
            onClick={handleTestEmail}
            disabled={(!smtpConfigured && !msConnected) || !testEmail || saving === 'test'}
            className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all whitespace-nowrap disabled:opacity-40">
            {saving === 'test' ? 'Sending…' : 'Send Test Email'}
          </button>
        </div>
      </Card>
    </div>
  )
}
