'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import BugReportModal from './BugReportModal'
import PortalIcon from '@/components/ui/PortalIcon'
import AdminAccountMenu from './AdminAccountMenu'

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

export default function AdminTopBar({ username }: Props) {
  const [bugOpen, setBugOpen] = useState(false)
  const pathname = usePathname()
  const crumb = getSection(pathname)

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
          <AdminAccountMenu username={username} />
        </div>
      </div>
    </header>
  )
}
