'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorLoginForm({ portalName, siteName }: { portalName: string; siteName: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Login failed')
      window.location.href = '/vendor'
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all'

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[400px] bg-slate flex-col justify-between p-10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display">V</span>
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight">
            {portalName}
          </span>
        </div>
        <div>
          <h2 className="font-display font-extrabold text-[28px] text-white leading-tight mb-4">
            B2B Partner<br />Portal
          </h2>
          <ul className="space-y-2 text-white/60 text-[13.5px]">
            <li>✓ Submit booking requests for your clients</li>
            <li>✓ Track trip history and booking status</li>
            <li>✓ Manage your client list</li>
            <li>✓ Raise support enquiries</li>
          </ul>
        </div>
        <p className="text-white/30 text-[12px]">{siteName}</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f0efe9] p-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="font-display font-extrabold text-[26px] tracking-tight">Sign in</h1>
            <p className="text-[14px] text-ink-3 mt-1">Partner portal access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-[13px] rounded-[6px] px-3 py-2 text-red-600 bg-red-50 border border-red-200">{error}</p>
            )}
            <div>
              <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Username</label>
              <input className={inp} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Password</label>
              <input className={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="accent-accent w-4 h-4 rounded"
              />
              <span className="text-[13px] text-ink-3">Remember me for 30 days</span>
            </label>
            <button type="submit" disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white font-display font-bold text-[14px] py-3 rounded-[6px] transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
