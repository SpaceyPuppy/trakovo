'use client'
import { useState } from 'react'
import AdminSidebar from './AdminSidebar'

export default function AdminShell({ adminName, logoUrl, children }: { adminName: string; logoUrl?: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f0efe9]">
      <AdminSidebar
        adminName={adminName}
        logoUrl={logoUrl}
        expanded={expanded}
        mobileOpen={mobileOpen}
        onToggle={() => setExpanded(e => !e)}
        onOpenMobile={() => setMobileOpen(true)}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — only visible below lg breakpoint */}
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-slate flex items-center px-4 gap-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-[6px] hover:bg-white/10 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight">{adminName}</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
