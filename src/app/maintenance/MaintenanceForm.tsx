'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const COPY = {
  development: {
    modeLabel: 'Preview Access',
    leftHeading: <>We&apos;re getting<br />things<br /><em className="not-italic text-accent">ready.</em></>,
    leftBody: 'This site is currently under development. If you have preview access, enter your password below.',
    mobileSubtitle: 'Preview Access',
    heading: 'Coming soon',
    subheading: 'Enter your preview password to access the site',
    passwordLabel: 'Preview Password',
    footerLabel: 'Preview',
  },
  maintenance: {
    modeLabel: 'Under Maintenance',
    leftHeading: <>We&apos;re under<br /><em className="not-italic text-accent">wraps.</em></>,
    leftBody: "This site is currently under maintenance. We're sorry for the inconvenience, but we should be back shortly.",
    mobileSubtitle: 'Under Maintenance',
    heading: "We're under wraps",
    subheading: "If you're an admin, enter the bypass password",
    passwordLabel: 'Bypass Password',
    footerLabel: 'Maintenance',
  },
}

function MaintenanceFormInner({ siteName }: { siteName: string }) {
  const params = useSearchParams()
  const mode = params.get('mode') === 'maintenance' ? 'maintenance' : 'development'
  const copy = COPY[mode]

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/maintenance-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = '/'
      } else {
        setLoading(false)
        setError('Incorrect password. Please try again.')
      }
    } catch {
      setLoading(false)
      setError('Connection error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between bg-slate w-[44%] px-14 py-14 relative overflow-hidden flex-shrink-0">
        <div className="hero-noise" />

        <div className="relative z-10">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center text-white font-display font-extrabold text-base mb-10">
            A
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-5 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-accent inline-block" />{copy.modeLabel}
          </p>
          <h1 className="font-display font-extrabold text-[clamp(28px,3vw,42px)] leading-[1.08] tracking-tight text-white mb-6">
            {copy.leftHeading}
          </h1>
          <p className="text-[14px] text-white/45 font-light leading-[1.75] max-w-[270px]">
            {copy.leftBody}
          </p>
        </div>

        <div className="relative z-10 flex gap-6 pt-8 border-t border-white/10 flex-wrap">
          {[
            ['Vehicles', 'Browse the fleet'],
            ['Bookings', 'Reserve your ride'],
            ['Support', "We're here to help"],
          ].map(([title, sub]) => (
            <div key={title}>
              <p className="font-display font-bold text-[14px] text-white">{title}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-bg px-6 py-12 min-h-screen">
        <div className="w-full max-w-[400px] animate-fade-up">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-white font-display font-extrabold text-xl mx-auto mb-3 shadow-card">
              A
            </div>
            <p className="font-display font-bold text-[17px] tracking-tight text-ink">{siteName}</p>
            <p className="text-[12px] text-ink-4 mt-0.5">{copy.mobileSubtitle}</p>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-[28px] tracking-tight">{copy.heading}</h2>
            <p className="text-[14px] text-ink-3 mt-1">{copy.subheading}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-4 py-3 flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0 text-red-500">
                  <circle cx="7.5" cy="7.5" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.5 4.5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7.5" cy="10.5" r="0.75" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider block">
                {copy.passwordLabel}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-border bg-white rounded-[8px] px-4 py-3 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white font-display font-bold text-[15px] py-3.5 rounded-[8px] hover:bg-accent-dark active:scale-[0.99] transition-all disabled:opacity-60 mt-1 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <><span className="spinner" /> Verifying…</>
              ) : (
                'Enter Site →'
              )}
            </button>
          </form>

          <p className="text-center text-[12px] text-ink-4 mt-10">
            {siteName} · {copy.footerLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MaintenanceForm({ siteName }: { siteName: string }) {
  return (
    <Suspense>
      <MaintenanceFormInner siteName={siteName} />
    </Suspense>
  )
}
