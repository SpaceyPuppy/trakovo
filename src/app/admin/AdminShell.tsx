'use client'
import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function AdminShell({
  adminName,
  logoUrl,
  username,
  children,
}: {
  adminName: string
  logoUrl?: string
  username: string
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const initials = getInitials(username)

  return (
    <div className="flex flex-col h-screen bg-[#f0efe9] overflow-hidden">

      {/* Desktop top bar — full width, hidden on mobile */}
      <AdminTopBar adminName={adminName} logoUrl={logoUrl} username={username} />

      {/* Body row: sidebar + content */}
      <div className="flex flex-1 min-h-0">

        <AdminSidebar
          adminName={adminName}
          logoUrl={logoUrl}
          expanded={expanded}
          mobileOpen={mobileOpen}
          onToggle={() => setExpanded(e => !e)}
          onOpenMobile={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* Mobile top bar — only visible below lg */}
          <header className="lg:hidden sticky top-0 z-20 h-11 bg-slate flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">

            {/* Left: hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-[6px] hover:bg-white/10 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Centre: portal name */}
            <span className="font-display font-extrabold text-[14px] text-white tracking-tight absolute left-1/2 -translate-x-1/2">
              {adminName}
            </span>

            {/* Right: avatar (taps to open sidebar on mobile; full dropdown would be a separate later enhancement) */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-[10.5px] font-bold select-none"
            >
              {initials}
            </button>

          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
