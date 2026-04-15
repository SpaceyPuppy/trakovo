'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin',           label: 'Dashboard', icon: '⊞', exact: true  },
  { href: '/admin/vehicles',  label: 'Vehicles',  icon: '🚗', exact: false },
  { href: '/admin/bookings',  label: 'Bookings',  icon: '📋', exact: false },
  { href: '/admin/enquiries', label: 'Enquiries', icon: '📬', exact: false },
  { href: '/admin/calendar',  label: 'Calendar',  icon: '📅', exact: false },
  { href: '/admin/blockouts', label: 'Blockouts', icon: '🚫', exact: false },
  { href: '/admin/customers', label: 'Customers', icon: '👥', exact: false },
  { href: '/admin/invoices',  label: 'Invoices',  icon: '🧾', exact: false },
  { href: '/admin/reports',   label: 'Reports',   icon: '📊', exact: false },
  { href: '/admin/vendors',   label: 'Vendors',   icon: '🏢', exact: false },
  { href: '/admin/drivers',   label: 'Drivers',   icon: '🚘', exact: false },
  { href: '/admin/users',     label: 'Users',     icon: '👤', exact: false },
]

interface Props {
  adminName: string
  logoUrl?: string
  expanded: boolean
  mobileOpen: boolean
  onToggle: () => void
  onOpenMobile: () => void
  onClose: () => void
}

function IconCollapse() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function IconExpand() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

export default function AdminSidebar({ adminName, logoUrl, expanded, mobileOpen, onToggle, onClose }: Props) {
  const path = usePathname()

  function renderNav(exp: boolean, onItemClick: () => void) {
    return (
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const isActive = item.exact ? path === item.href : path.startsWith(item.href)
          const itemClass = cn(
            'flex items-center rounded-[6px] text-[13.5px] font-medium transition-all',
            exp ? 'gap-2.5 px-3 py-2.5' : 'justify-center py-2.5 px-2',
            isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
          )
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={itemClass}
              title={!exp ? item.label : undefined}
            >
              <span className={cn('text-base flex-shrink-0', !exp && 'w-5 text-center')}>{item.icon}</span>
              {exp && <span>{item.label}</span>}
            </Link>
          )
        })}

      </nav>
    )
  }

  // Desktop sidebar content
  function renderDesktop() {
    return (
      <div className="flex flex-col h-full">
        {/* Header — collapse toggle only (logo/name are in the top bar) */}
        <div className={cn(
          'h-[52px] flex items-center border-b border-white/10 flex-shrink-0',
          expanded ? 'px-3 justify-end' : 'px-2 justify-center'
        )}>
          <button
            onClick={onToggle}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[5px] transition-all"
          >
            {expanded ? <IconCollapse /> : <IconExpand />}
          </button>
        </div>

        {renderNav(expanded, () => {})}
      </div>
    )
  }

  // Mobile drawer content
  function renderMobile() {
    return (
      <div className="flex flex-col h-full">
        {/* Header — logo + name + close */}
        <div className="h-14 flex items-center px-3 gap-2 border-b border-white/10 flex-shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt={adminName} className="h-7 w-auto max-w-[80px] object-contain flex-shrink-0" />
            : <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display flex-shrink-0">A</span>
          }
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight flex-1 truncate min-w-0">{adminName}</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[5px] transition-all flex-shrink-0"
          >
            <IconX />
          </button>
        </div>

        {renderNav(true, onClose)}
      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-slate flex-shrink-0 overflow-hidden transition-[width] duration-200',
        expanded ? 'w-[220px]' : 'w-[60px]'
      )}>
        {renderDesktop()}
      </aside>

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-[260px] bg-slate z-40 flex flex-col lg:hidden transition-transform duration-200 ease-in-out overflow-hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {renderMobile()}
      </aside>
    </>
  )
}
