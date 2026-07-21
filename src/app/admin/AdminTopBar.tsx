'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BugReportModal from './BugReportModal'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface Props {
  adminName: string
  logoUrl?: string
  username: string
}

export default function AdminTopBar({ adminName, logoUrl, username }: Props) {
  const [open, setOpen] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)
  const router = useRouter()
  const initials = getInitials(username)

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <header className="hidden lg:flex items-center h-[52px] bg-slate border-b border-white/10 flex-shrink-0 z-30 print:hidden">

      {/* Brand — left */}
      <Link
        href="/admin"
        className="flex items-center gap-2.5 px-4 h-full flex-shrink-0 hover:bg-white/5 transition-colors"
      >
        {logoUrl
          ? <img src={logoUrl} alt={adminName} className="h-7 w-auto max-w-[100px] object-contain flex-shrink-0" />
          : <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display flex-shrink-0">A</span>
        }
        <span className="font-display font-extrabold text-[15px] text-white tracking-tight">{adminName}</span>
      </Link>

      {/* Centre — reserved for future section links (Dispatch, Fleet, etc.) */}
      <div className="flex-1" />

      {/* Bug report button */}
      <button
        onClick={() => setBugOpen(true)}
        title="Report a bug"
        className="flex items-center gap-1.5 h-full px-3 text-white/50 hover:text-white hover:bg-white/8 transition-colors text-[12.5px] font-medium"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a4 4 0 00-4 4v1H4a1 1 0 000 2h1.1A6.002 6.002 0 0010 16a6.002 6.002 0 004.9-7H16a1 1 0 000-2h-2V6a4 4 0 00-4-4zM8 6a2 2 0 114 0v1H8V6z" fill="currentColor"/>
          <path d="M3 9h1M16 9h1M4.5 14.5l1-1M15.5 14.5l-1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="hidden xl:block">Report Bug</span>
      </button>

      <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />

      {/* Profile dropdown — right */}
      <div className="relative h-full flex items-center px-3">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] border transition-all ${
            open
              ? 'bg-white/10 border-white/[0.18]'
              : 'border-transparent hover:bg-white/8 hover:border-white/10'
          }`}
        >
          <span className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-[11.5px] font-bold flex-shrink-0 select-none">
            {initials}
          </span>
          <span className="text-[13px] font-semibold text-white/70 hidden xl:block max-w-[140px] truncate">
            {username}
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 text-white/40 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Dropdown panel */}
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[224px] bg-white border border-border rounded-[10px] shadow-lg overflow-hidden">

              {/* User header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 select-none">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink leading-tight truncate">{username}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5 font-medium">Administrator</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/admin/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13.5px] font-medium text-ink hover:bg-bg transition-colors"
                >
                  <span className="text-[14px] w-5 text-center opacity-60 flex-shrink-0">⚙</span>
                  Settings
                </Link>
                <Link
                  href="/admin/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13.5px] font-medium text-ink hover:bg-bg transition-colors"
                >
                  <span className="text-[14px] w-5 text-center opacity-60 flex-shrink-0">👤</span>
                  Profile Settings
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13.5px] font-medium text-ink hover:bg-bg transition-colors"
                >
                  <span className="text-[14px] w-5 text-center opacity-60 flex-shrink-0">↗</span>
                  View Site
                </Link>

                <div className="h-px bg-border my-1" />

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13.5px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span className="text-[14px] w-5 text-center flex-shrink-0">⏏</span>
                  Sign Out
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </header>
  )
}
