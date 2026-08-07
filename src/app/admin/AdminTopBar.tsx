'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import BugReportModal from './BugReportModal'
import PortalIcon from '@/components/ui/PortalIcon'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getSection(pathname: string): { section: string; page: string } {
  if (pathname === '/admin') return { section: 'Operations', page: 'Overview' }
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[1] === 'settings' ? 'Administration' : 'Operations'
  const labels: Record<string, string> = {
    bookings: 'Bookings', enquiries: 'Enquiries', calendar: 'Calendar', blockouts: 'Blockouts',
    vehicles: 'Vehicles', customers: 'Customers', vendors: 'Vendors', drivers: 'Drivers',
    invoices: 'Billing', reports: 'Reports', users: 'Users', settings: 'Settings', profile: 'Profile',
  }
  return { section, page: labels[segments[1]] ?? 'Admin' }
}

interface Props {
  adminName: string
  logoUrl?: string
  username: string
}

export default function AdminTopBar({ adminName, username }: Props) {
  const [open, setOpen] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const initials = getInitials(username)
  const crumb = getSection(pathname)

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <header className="hidden lg:flex items-center h-[70px] bg-white border-b border-border flex-shrink-0 z-30 print:hidden">
      <div className="flex-1 min-w-0 px-8">
        <div className="flex items-center gap-2 text-[12px] text-ink-3">
          <span>{crumb.section}</span>
          <PortalIcon name="chevron-right" size={14} />
          <strong className="font-semibold text-ink">{crumb.page}</strong>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-5">
        <button
          onClick={() => setBugOpen(true)}
          aria-label="Report a bug"
          className="w-9 h-9 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg rounded-[8px] transition-colors"
        >
          <PortalIcon name="message-square-warning" size={17} />
        </button>
        <button
          aria-label="Help"
          className="w-9 h-9 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg rounded-[8px] transition-colors"
        >
          <PortalIcon name="circle-help" size={17} />
        </button>

        <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />

        <div className="relative ml-2 pl-3 border-l border-border">
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] border transition-all ${
              open ? 'bg-bg border-border' : 'border-transparent hover:bg-bg'
            }`}
          >
            <span className="w-8 h-8 rounded-full bg-[#273d5f] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 select-none">
              {initials}
            </span>
            <span className="text-left hidden xl:block max-w-[140px] truncate">
              <span className="block text-[12px] font-semibold text-ink truncate">{username}</span>
              <span className="block text-[10px] text-ink-3 mt-0.5">Administrator</span>
            </span>
            <PortalIcon name="chevron-down" size={15} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[236px] bg-white border border-border rounded-[10px] shadow-card-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <span className="w-9 h-9 rounded-full bg-[#273d5f] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 select-none">{initials}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-ink leading-tight truncate">{username}</p>
                    <p className="text-[11px] text-ink-3 mt-0.5 font-medium">Administrator</p>
                  </div>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <MenuLink href="/admin/settings" icon="settings-2" onClick={() => setOpen(false)}>Settings</MenuLink>
                  <MenuLink href="/admin/profile" icon="users" onClick={() => setOpen(false)}>Profile settings</MenuLink>
                  <MenuLink href="/" icon="arrow-up-right" onClick={() => setOpen(false)} target="_blank">View site</MenuLink>
                  <div className="h-px bg-border my-1" />
                  <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left">
                    <PortalIcon name="log-out" size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuLink({ href, icon, onClick, target, children }: { href: string; icon: Parameters<typeof PortalIcon>[0]['name']; onClick: () => void; target?: string; children: React.ReactNode }) {
  return (
    <Link href={href} target={target} onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium text-ink hover:bg-bg transition-colors">
      <PortalIcon name={icon} size={16} className="text-ink-3" />
      {children}
    </Link>
  )
}
