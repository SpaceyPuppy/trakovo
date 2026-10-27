'use client'
import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'
import PortalIcon from '@/components/ui/PortalIcon'
import AdminAccountMenu from './AdminAccountMenu'

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

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden print:block print:h-auto print:bg-white print:overflow-visible">

      {/* Desktop top bar — full width, hidden on mobile */}
      <AdminTopBar adminName={adminName} logoUrl={logoUrl} username={username} />

      {/* Body row: sidebar + content */}
      <div className="flex flex-1 min-h-0 print:block print:min-h-0">

        <AdminSidebar
          adminName={adminName}
          logoUrl={logoUrl}
          expanded={expanded}
          mobileOpen={mobileOpen}
          onToggle={() => setExpanded(e => !e)}
          onOpenMobile={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0 print:block print:min-h-0">

          {/* Mobile top bar — only visible below lg */}
          <header className="lg:hidden sticky top-0 z-20 h-11 bg-slate flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0 print:hidden">

            {/* Left: hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-[6px] hover:bg-white/10 transition-all"
            >
              <PortalIcon name="menu" size={19} />
            </button>

            {/* Centre: portal name */}
            <span className="font-display font-extrabold text-[14px] text-white tracking-tight absolute left-1/2 -translate-x-1/2">
              {adminName}
            </span>

            <AdminAccountMenu username={username} compact onOpen={() => setMobileOpen(false)} />

          </header>

          <main className="flex-1 overflow-auto bg-bg print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
