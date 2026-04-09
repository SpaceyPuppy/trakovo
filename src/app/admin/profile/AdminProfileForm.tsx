'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all disabled:opacity-50 disabled:bg-bg'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export default function AdminProfileForm({ username, isMaster }: { username: string; isMaster: boolean }) {
  const router = useRouter()

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function flashPw(text: string, type: 'success' | 'error') {
    setPwMsg({ type, text })
    setTimeout(() => setPwMsg(null), 4000)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { flashPw('New passwords do not match', 'error'); return }
    if (newPw.length < 6) { flashPw('New password must be at least 6 characters', 'error'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const d = await res.json()
      if (!res.ok) { flashPw(d.error ?? 'Failed to update password', 'error'); return }
      flashPw('Password updated successfully', 'success')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      router.refresh()
    } catch {
      flashPw('An error occurred', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <Card title="Account" description="Your admin account details.">
        <Field label="Username">
          <input type="text" value={username} disabled className={inp} />
        </Field>
        <Field label="Role">
          <input type="text" value={isMaster ? 'Master Administrator' : 'Administrator'} disabled className={inp} />
        </Field>
      </Card>

      {/* Password change */}
      <Card
        title="Change Password"
        description={isMaster
          ? 'Master admin password is managed via environment variables and cannot be changed here.'
          : 'Update your login password.'
        }
      >
        {isMaster ? (
          <p className="text-[13.5px] text-ink-3">
            To change the master admin password, update the <code className="font-mono bg-bg px-1.5 py-0.5 rounded text-[12px]">ADMIN_PASSWORD</code> environment variable and restart the application.
          </p>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Field label="Current Password">
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                className={inp} required autoComplete="current-password" />
            </Field>
            <Field label="New Password">
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                className={inp} required autoComplete="new-password" minLength={6} />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className={inp} required autoComplete="new-password" />
            </Field>

            {pwMsg && (
              <div className={`text-[13px] px-4 py-2.5 rounded-[6px] border ${
                pwMsg.type === 'success'
                  ? 'bg-success-bg text-success border-success/30'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {pwMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="bg-accent text-white font-semibold text-[13.5px] px-5 py-2.5 rounded-[6px] hover:bg-accent-dark disabled:opacity-50 transition-colors">
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
