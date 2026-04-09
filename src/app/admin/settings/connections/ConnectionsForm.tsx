'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import PushCard from './PushCard'

interface Props {
  smtpConfigured: boolean
  smtpVars: Record<string, boolean>
  msConfigured: boolean
  msConnected: boolean
  msConnectedEmail: string
  msCalendarId: string
  msCalendarName: string
  pushConfigured: boolean
  crazytelEnabled: boolean
  crazytelApiKeySet: boolean
  crazytelAccountKeySet: boolean
  crazytelFromNumber: string
  crazytelDispatchNumber: string
}

type TileId = 'ms' | 'smtp' | 'push' | 'crazytel'
type TileStatus = 'connected' | 'configured' | 'not_set'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'

function StatusBadge({ status }: { status: TileStatus }) {
  if (status === 'connected' || status === 'configured') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success-bg border border-success/20 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      {status === 'connected' ? 'Connected' : 'Configured'}
    </span>
  }
  return <span className="text-[10px] font-semibold text-ink-3 bg-bg border border-border px-1.5 py-0.5 rounded-full">Not set</span>
}

function Tile({ id, label, description, status, icon, selected, onClick }: {
  id: TileId; label: string; description: string; status: TileStatus
  icon: React.ReactNode; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3.5 rounded-xl border transition-all',
        selected
          ? 'border-accent bg-accent/5 ring-1 ring-accent/20 shadow-sm'
          : 'border-border bg-white hover:border-ink-3 hover:shadow-sm'
      )}
    >
      <div className="mb-2.5">{icon}</div>
      <p className="font-display font-bold text-[13px] text-ink leading-tight">{label}</p>
      <p className="text-[11px] text-ink-3 mt-0.5 leading-tight mb-2">{description}</p>
      <StatusBadge status={status} />
    </button>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-bg">
      <h3 className="font-display font-bold text-[14px]">{title}</h3>
      {description && <p className="text-[12.5px] text-ink-3 mt-0.5">{description}</p>}
    </div>
  )
}

// ─── Microsoft 365 panel ─────────────────────────────────────────────────────

type MsCalendar = { id: string; name: string }

function MsPanel({ msConfigured, msConnected: initConnected, msConnectedEmail: initEmail, msCalendarId: initCalendarId, msCalendarName: initCalendarName }: {
  msConfigured: boolean; msConnected: boolean; msConnectedEmail: string
  msCalendarId: string; msCalendarName: string
}) {
  const [connected, setConnected] = useState(initConnected)
  const [email, setEmail] = useState(initEmail)
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [calendars, setCalendars] = useState<MsCalendar[]>([])
  const [calendarId, setCalendarId] = useState(initCalendarId)
  const [calendarName, setCalendarName] = useState(initCalendarName)
  const [calendarSaving, setCalendarSaving] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  useEffect(() => {
    if (!connected) return
    fetch('/api/admin/settings/ms-calendars')
      .then(r => r.json())
      .then(d => { if (d.calendars?.length) setCalendars(d.calendars) })
      .catch(() => null)
  }, [connected])

  async function handleDisconnect() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings/ms-disconnect', { method: 'DELETE' })
      setConnected(false); setEmail(''); setCalendars([])
      flash('Microsoft 365 disconnected', 'success')
    } catch { flash('Disconnect failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleTest() {
    if (!testEmail) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Send failed')
      flash('Test email sent!', 'success')
    } catch (e) { flash(e instanceof Error ? e.message : 'Send failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleCalendarSave() {
    setCalendarSaving(true)
    try {
      const selected = calendars.find(c => c.id === calendarId)
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ms_calendar_id: calendarId,
          ms_calendar_name: selected?.name ?? '',
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setCalendarName(selected?.name ?? '')
      flash('Calendar saved', 'success')
    } catch { flash('Save failed', 'error') }
    finally { setCalendarSaving(false) }
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <SectionHeader title="Microsoft 365" description="Email and Calendar sync via Outlook OAuth." />
      <div className="px-5 py-4 space-y-4">
        {msg && <p className={`text-[13px] rounded-[6px] px-3 py-2 ${msg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>{msg.text}</p>}
        {!msConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[6px] px-4 py-3 text-[13px] text-yellow-700">
            Add <code className="font-mono text-[12px]">MS_CLIENT_ID</code>, <code className="font-mono text-[12px]">MS_CLIENT_SECRET</code>, and <code className="font-mono text-[12px]">MS_TENANT_ID</code> to your <code className="font-mono text-[12px]">.env.local</code> to enable this.
          </div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="bg-success-bg border border-success/30 rounded-[6px] px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-success font-semibold">Connected</p>
                <p className="text-[12px] text-ink-3 mt-0.5">Sending as: <span className="font-medium text-ink">{email}</span></p>
              </div>
              <button onClick={handleDisconnect} disabled={saving}
                className="text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-[5px] transition-colors disabled:opacity-50 whitespace-nowrap">
                {saving ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>

            {/* Calendar picker */}
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-2">Sync calendar</p>
              {calendars.length > 0 ? (
                <div className="flex items-center gap-3">
                  <select
                    value={calendarId}
                    onChange={e => setCalendarId(e.target.value)}
                    className={cn(inp, 'flex-1')}
                  >
                    <option value="">Default calendar</option>
                    {calendars.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={handleCalendarSave} disabled={calendarSaving}
                    className="bg-accent text-white font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap">
                    {calendarSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-3">
                  {calendarName ? `Using: ${calendarName}` : 'Loading calendars…'}
                </p>
              )}
              <p className="text-[11.5px] text-ink-4 mt-1.5">Bookings will be synced to the selected calendar. Leave as "Default calendar" to use your primary Outlook calendar.</p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-bold text-ink-4 uppercase tracking-wider mb-2">Test email</p>
              <p className="text-[12px] text-ink-4 mb-2">Microsoft 365 is active. Outgoing emails use your Outlook account — SMTP is ignored while connected.</p>
              <div className="flex items-center gap-3">
                <input className={cn(inp, 'flex-1')} type="email" value={testEmail}
                  onChange={e => setTestEmail(e.target.value)} placeholder="test@email.com" />
                <button onClick={handleTest} disabled={!testEmail || saving}
                  className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all whitespace-nowrap disabled:opacity-40">
                  {saving ? 'Sending…' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-3">Connect your Microsoft 365 account to send booking notifications and sync bookings to Outlook Calendar.</p>
            <a href="/api/admin/settings/ms-auth"
              className="inline-flex items-center gap-2 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-[13px] px-4 py-2.5 rounded-[6px] transition-colors">
              <svg width="16" height="16" viewBox="0 0 23 23" fill="none">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
              </svg>
              Connect with Microsoft
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SMTP panel ───────────────────────────────────────────────────────────────

function SmtpPanel({ smtpConfigured, smtpVars, msConnected }: {
  smtpConfigured: boolean; smtpVars: Record<string, boolean>; msConnected: boolean
}) {
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  function flash(text: string, type: 'success' | 'error') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleTest() {
    if (!testEmail) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Send failed')
      flash('Test email sent!', 'success')
    } catch (e) { flash(e instanceof Error ? e.message : 'Send failed', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <SectionHeader title="SMTP Fallback" description="Used when Microsoft 365 is not connected. Configure via environment variables." />
      <div className="px-5 py-4 space-y-4">
        {msg && <p className={`text-[13px] rounded-[6px] px-3 py-2 ${msg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>{msg.text}</p>}
        <div className={cn('rounded-[6px] px-4 py-3 text-[13px]', smtpConfigured ? 'bg-success-bg border border-success/30 text-success' : 'bg-yellow-50 border border-yellow-200 text-yellow-700')}>
          {smtpConfigured ? 'SMTP is configured and ready as a fallback.' : 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env.local file.'}
        </div>
        <div className="bg-bg border border-border rounded-[6px] px-4 py-3 font-mono text-[12px] text-ink-3 space-y-1">
          {['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_FROM'].map(k => (
            <div key={k}><span className="text-ink-2">{k}</span> = {smtpVars[k] ? '••••••' : <em className="text-red-400">not set</em>}</div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input className={cn(inp, 'flex-1')} type="email" value={testEmail}
            onChange={e => setTestEmail(e.target.value)} placeholder="test@email.com" />
          <button onClick={handleTest} disabled={(!smtpConfigured && !msConnected) || !testEmail || saving}
            className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all whitespace-nowrap disabled:opacity-40">
            {saving ? 'Sending…' : 'Send Test Email'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CrazyTel SMS panel ───────────────────────────────────────────────────────

type AccountInfo = { balance: string | null; numbers: string[]; account_found: boolean; numbers_found: boolean }

function CrazytelPanel({ initialEnabled, initialApiKeySet, initialAccountKeySet, initialFromNumber, initialDispatchNumber }: {
  initialEnabled: boolean; initialApiKeySet: boolean; initialAccountKeySet: boolean; initialFromNumber: string; initialDispatchNumber: string
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [apiKey, setApiKey] = useState('')
  const [accountKey, setAccountKey] = useState('')
  const [fromNumber, setFromNumber] = useState(initialFromNumber)
  const [dispatchNumber, setDispatchNumber] = useState(initialDispatchNumber)
  const [testNumber, setTestNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState(false)
  const [editingAccountKey, setEditingAccountKey] = useState(false)
  const [editingFromNumber, setEditingFromNumber] = useState(false)
  const [editingDispatchNumber, setEditingDispatchNumber] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 5000)
  }

  async function fetchAccount() {
    setAccountLoading(true)
    try {
      const res = await fetch('/api/admin/settings/crazytel/account')
      if (res.ok) setAccount(await res.json())
    } catch { /* silent */ }
    finally { setAccountLoading(false) }
  }

  useEffect(() => {
    if (initialAccountKeySet) fetchAccount()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { enabled, from_number: fromNumber, dispatch_number: dispatchNumber }
      if (apiKey) body.api_key = apiKey
      if (accountKey) body.account_api_key = accountKey
      const res = await fetch('/api/admin/settings/crazytel', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      flash('CrazyTel settings saved', 'success')
      setApiKey('')
      setAccountKey('')
      setEditingApiKey(false)
      setEditingAccountKey(false)
      setEditingFromNumber(false)
      setEditingDispatchNumber(false)
      // Refresh account info after saving a new account key
      if (accountKey) fetchAccount()
    } catch { flash('Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleTest() {
    if (!testNumber) return
    setTesting(true)
    try {
      const res = await fetch('/api/admin/settings/crazytel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testNumber }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Test failed')
      flash('Test SMS sent!', 'success')
    } catch (e) { flash(e instanceof Error ? e.message : 'Test failed', 'error') }
    finally { setTesting(false) }
  }

  const availableNumbers = account?.numbers ?? []

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <SectionHeader title="CrazyTel SMS" description="Send SMS notifications to customers and your dispatch number when bookings are created." />
      <div className="px-5 py-4 space-y-4">
        {msg && <p className={`text-[13px] rounded-[6px] px-3 py-2 ${msg.type === 'success' ? 'text-success bg-success-bg border border-success/30' : 'text-red-600 bg-red-50 border border-red-200'}`}>{msg.text}</p>}

        {/* Account status (shown when account key is saved) */}
        {initialAccountKeySet && (
          <div className={cn('rounded-[6px] px-4 py-3 border text-[13px]', account ? 'bg-success-bg border-success/30' : 'bg-bg border-border')}>
            {accountLoading ? (
              <p className="text-ink-3">Verifying account…</p>
            ) : account ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-success">Connected</p>
                  {account.balance != null && <p className="text-[12px] text-ink-3 mt-0.5">Balance: <span className="text-ink font-medium">{account.balance}</span></p>}
                </div>
                <button onClick={fetchAccount} className="text-[12px] text-ink-3 hover:text-ink transition-colors whitespace-nowrap">Refresh</button>
              </div>
            ) : (
              <p className="text-ink-3">API key saved — account info unavailable</p>
            )}
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-ink">Enable SMS notifications</p>
            <p className="text-[12px] text-ink-3 mt-0.5">SMS only sends when enabled and fully configured</p>
          </div>
          <button
            onClick={() => setEnabled(v => !v)}
            className={cn('relative rounded-full transition-colors border', enabled ? 'bg-accent border-accent' : 'bg-bg border-border')}
            style={{ width: 40, height: 22 }}
          >
            <span className={cn('absolute top-0.5 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-[18px]' : 'translate-x-0.5')} style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="border-t border-border" />

        {/* SMS API Key */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">SMS API Key</label>
          {!editingApiKey && initialApiKeySet ? (
            <div className="flex items-center justify-between bg-bg border border-border rounded-[6px] px-3 py-2.5">
              <span className="font-mono text-[13.5px] text-ink-3">••••••••••••••••</span>
              <button onClick={() => setEditingApiKey(true)} className="text-[12px] text-accent hover:underline font-medium">
                Edit
              </button>
            </div>
          ) : editingApiKey ? (
            <div className="space-y-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter new CrazyTel SMS API key…"
                className={inp}
                autoComplete="off"
              />
              <div className="flex gap-2">
                <button onClick={() => { setApiKey(''); setEditingApiKey(false) }} className="text-[12px] text-ink-3 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter CrazyTel SMS API key…"
              className={inp}
              autoComplete="off"
            />
          )}
          <p className="text-[11px] text-ink-3 mt-1">Used to send SMS via sms.crazytel.net.au</p>
        </div>

        {/* Account API Key */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">Account API Key</label>
          {!editingAccountKey && initialAccountKeySet ? (
            <div className="flex items-center justify-between bg-bg border border-border rounded-[6px] px-3 py-2.5">
              <span className="font-mono text-[13.5px] text-ink-3">••••••••••••••••</span>
              <button onClick={() => setEditingAccountKey(true)} className="text-[12px] text-accent hover:underline font-medium">
                Edit
              </button>
            </div>
          ) : editingAccountKey ? (
            <div className="space-y-2">
              <input
                type="password"
                value={accountKey}
                onChange={e => setAccountKey(e.target.value)}
                placeholder="Enter new CrazyTel account API key…"
                className={inp}
                autoComplete="off"
              />
              <div className="flex gap-2">
                <button onClick={() => { setAccountKey(''); setEditingAccountKey(false) }} className="text-[12px] text-ink-3 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <input
              type="password"
              value={accountKey}
              onChange={e => setAccountKey(e.target.value)}
              placeholder="Enter CrazyTel account API key…"
              className={inp}
              autoComplete="off"
            />
          )}
          <p className="text-[11px] text-ink-3 mt-1">Used to fetch account balance and phone numbers from crazytel.io</p>
        </div>

        {/* From number */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">From Number <span className="font-normal text-ink-3">(sender number on your CrazyTel account)</span></label>
          {!editingFromNumber && initialFromNumber ? (
            <div className="flex items-center justify-between bg-bg border border-border rounded-[6px] px-3 py-2.5">
              <span className="font-mono text-[13.5px] font-semibold text-ink">{initialFromNumber}</span>
              <button onClick={() => { setFromNumber(initialFromNumber); setEditingFromNumber(true) }} className="text-[12px] text-accent hover:underline font-medium">
                Edit
              </button>
            </div>
          ) : editingFromNumber ? (
            <div className="space-y-2">
              {availableNumbers.length > 0 ? (
                <select value={fromNumber} onChange={e => setFromNumber(e.target.value)} className={inp}>
                  <option value="">Select a number…</option>
                  {availableNumbers.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <input type="tel" value={fromNumber} onChange={e => setFromNumber(e.target.value)}
                  placeholder="0400000000" className={inp} />
              )}
              <div className="flex gap-2">
                <button onClick={() => { setEditingFromNumber(false); handleSave() }} className="text-[12px] text-accent hover:underline font-medium">
                  Save
                </button>
                <button onClick={() => { setFromNumber(initialFromNumber); setEditingFromNumber(false) }} className="text-[12px] text-ink-3 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {availableNumbers.length > 0 ? (
                <select value={fromNumber} onChange={e => setFromNumber(e.target.value)} className={inp}>
                  <option value="">Select a number…</option>
                  {availableNumbers.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <input type="tel" value={fromNumber} onChange={e => setFromNumber(e.target.value)}
                  placeholder="0400000000" className={inp} />
              )}
            </div>
          )}
        </div>

        {/* Dispatch number */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">Dispatch Number <span className="font-normal text-ink-3">(receives new booking alerts)</span></label>
          {!editingDispatchNumber && initialDispatchNumber ? (
            <div className="flex items-center justify-between bg-bg border border-border rounded-[6px] px-3 py-2.5">
              <span className="font-mono text-[13.5px] font-semibold text-ink">{initialDispatchNumber}</span>
              <button onClick={() => { setDispatchNumber(initialDispatchNumber); setEditingDispatchNumber(true) }} className="text-[12px] text-accent hover:underline font-medium">
                Edit
              </button>
            </div>
          ) : editingDispatchNumber ? (
            <div className="space-y-2">
              <input type="tel" value={dispatchNumber} onChange={e => setDispatchNumber(e.target.value)}
                placeholder="0400000000" className={inp} />
              <div className="flex gap-2">
                <button onClick={() => { setEditingDispatchNumber(false); handleSave() }} className="text-[12px] text-accent hover:underline font-medium">
                  Save
                </button>
                <button onClick={() => { setDispatchNumber(initialDispatchNumber); setEditingDispatchNumber(false) }} className="text-[12px] text-ink-3 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <input type="tel" value={dispatchNumber} onChange={e => setDispatchNumber(e.target.value)}
              placeholder="0400000000" className={inp} />
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-display font-bold text-[13.5px] px-4 py-2.5 rounded-[6px] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>

        <div className="border-t border-border" />

        {/* Test SMS */}
        <div>
          <p className="text-[12px] font-semibold text-ink-2 mb-1.5">Send test SMS</p>
          <div className="flex items-center gap-3">
            <input type="tel" value={testNumber} onChange={e => setTestNumber(e.target.value)}
              placeholder="0400000000" className={cn(inp, 'flex-1')} />
            <button onClick={handleTest} disabled={!testNumber || testing}
              className="border border-border text-ink-3 font-semibold text-[13px] px-4 py-2.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-all whitespace-nowrap disabled:opacity-40">
              {testing ? 'Sending…' : 'Send Test SMS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function ConnectionsFormInner({
  smtpConfigured, smtpVars,
  msConfigured, msConnected, msConnectedEmail, msCalendarId, msCalendarName,
  pushConfigured,
  crazytelEnabled, crazytelApiKeySet, crazytelAccountKeySet, crazytelFromNumber, crazytelDispatchNumber,
}: Props) {
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<TileId | null>(null)

  // Auto-open the relevant panel on OAuth callback
  useEffect(() => {
    if (searchParams.get('ms') === 'connected' || searchParams.get('error')) setSelected('ms')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tiles: Array<{ id: TileId; label: string; description: string; status: TileStatus; icon: React.ReactNode }> = [
    {
      id: 'ms',
      label: 'Microsoft 365',
      description: 'Email & Calendar via Outlook OAuth',
      status: !msConfigured ? 'not_set' : msConnected ? 'connected' : 'not_set',
      icon: (
        <svg width="24" height="24" viewBox="0 0 23 23" fill="none">
          <rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
          <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
        </svg>
      ),
    },
    {
      id: 'smtp',
      label: 'SMTP',
      description: 'Fallback email delivery',
      status: smtpConfigured ? 'configured' : 'not_set',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      id: 'push',
      label: 'Web Push',
      description: 'Browser notifications',
      status: pushConfigured ? 'configured' : 'not_set',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
    },
    {
      id: 'crazytel',
      label: 'CrazyTel SMS',
      description: 'SMS booking notifications',
      status: crazytelEnabled && crazytelApiKeySet && crazytelFromNumber ? 'connected' : crazytelApiKeySet ? 'configured' : 'not_set',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ]

  function toggle(id: TileId) {
    setSelected(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-5">
      {/* OAuth callback banners */}
      {searchParams.get('ms') === 'connected' && (
        <p className="text-[13px] text-success bg-success-bg border border-success/30 rounded-[6px] px-3 py-2">
          Microsoft 365 connected successfully — emails will now be sent from your Outlook account.
        </p>
      )}
      {searchParams.get('error') && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">
          Connection failed ({searchParams.get('error')}). Please try again.
        </p>
      )}

      {/* App picker tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(t => (
          <Tile key={t.id} {...t} selected={selected === t.id} onClick={() => toggle(t.id)} />
        ))}
      </div>

      {/* Detail panel */}
      {selected === 'ms' && (
        <MsPanel msConfigured={msConfigured} msConnected={msConnected} msConnectedEmail={msConnectedEmail} msCalendarId={msCalendarId} msCalendarName={msCalendarName} />
      )}
      {selected === 'smtp' && (
        <SmtpPanel smtpConfigured={smtpConfigured} smtpVars={smtpVars} msConnected={msConnected} />
      )}
      {selected === 'push' && (
        <PushCard pushConfigured={pushConfigured} />
      )}
      {selected === 'crazytel' && (
        <CrazytelPanel
          initialEnabled={crazytelEnabled}
          initialApiKeySet={crazytelApiKeySet}
          initialAccountKeySet={crazytelAccountKeySet}
          initialFromNumber={crazytelFromNumber}
          initialDispatchNumber={crazytelDispatchNumber}
        />
      )}
    </div>
  )
}

export default function ConnectionsForm(props: Props) {
  return (
    <Suspense fallback={null}>
      <ConnectionsFormInner {...props} />
    </Suspense>
  )
}
