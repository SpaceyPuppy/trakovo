'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import PortalIcon, { type PortalIconName } from '@/components/ui/PortalIcon'

type NavItem = { href: string; label: string; icon: PortalIconName; exact?: boolean }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Overview', icon: 'layout-dashboard', exact: true },
      { href: '/admin/bookings', label: 'Bookings', icon: 'clipboard-list' },
      { href: '/admin/enquiries', label: 'Enquiries', icon: 'message-square-warning' },
      { href: '/admin/calendar', label: 'Calendar', icon: 'calendar-days' },
      { href: '/admin/blockouts', label: 'Blockouts', icon: 'calendar-off' },
    ],
  },
  {
    label: 'People & fleet',
    items: [
      { href: '/admin/vehicles', label: 'Vehicles', icon: 'car-front' },
      { href: '/admin/customers', label: 'Customers', icon: 'users' },
      { href: '/admin/vendors', label: 'Vendors', icon: 'building-2' },
      { href: '/admin/drivers', label: 'Drivers', icon: 'steering-wheel' },
    ],
  },
  {
    label: 'Finance & admin',
    items: [
      { href: '/admin/invoices', label: 'Billing', icon: 'receipt-text' },
      { href: '/admin/reports', label: 'Reports', icon: 'chart' },
      { href: '/admin/users', label: 'Users', icon: 'users' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings-2' },
    ],
  },
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

export default function AdminSidebar({ adminName, logoUrl, expanded, mobileOpen, onToggle, onClose }: Props) {
  const path = usePathname()

  function renderNav(exp: boolean, onItemClick: () => void) {
    return (
      <nav className="flex-1 px-2.5 py-5 overflow-y-auto" aria-label="Admin navigation">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-6 last:mb-0">
            {exp && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = item.exact ? path === item.href : path.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      'group flex items-center rounded-[8px] text-[13px] font-medium transition-all',
                      exp ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5 px-2',
                      isActive
                        ? 'bg-white/[0.10] text-white shadow-[inset_3px_0_0_#f06a24]'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                    )}
                    title={!exp ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <PortalIcon name={item.icon} size={17} className="flex-shrink-0" />
                    {exp && <span className="flex-1">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  function renderDesktop() {
    return (
      <div className="flex flex-col h-full">
        <div className={cn(
          'h-[70px] flex items-center border-b border-white/10 flex-shrink-0',
          expanded ? 'px-4 gap-3' : 'px-2 justify-center'
        )}>
          {expanded && (
            <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-2.5">
              {logoUrl
                ? <img src={logoUrl} alt={adminName} className="h-7 w-auto max-w-[92px] object-contain flex-shrink-0" />
                : <span className="w-8 h-8 bg-accent rounded-[8px] flex items-center justify-center text-white text-sm font-extrabold font-display flex-shrink-0">T</span>
              }
              <span className="min-w-0 truncate">
                <span className="block font-display font-bold text-[15px] text-white tracking-tight truncate">{adminName}</span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35 mt-0.5">Admin workspace</span>
              </span>
            </Link>
          )}
          <button
            onClick={onToggle}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[7px] transition-all flex-shrink-0"
          >
            <PortalIcon name="chevron-right" size={16} className={expanded ? 'rotate-180' : undefined} />
          </button>
        </div>
        {renderNav(expanded, () => {})}
      </div>
    )
  }

  function renderMobile() {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 flex items-center px-3 gap-2 border-b border-white/10 flex-shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt={adminName} className="h-7 w-auto max-w-[80px] object-contain flex-shrink-0" />
            : <span className="w-8 h-8 bg-accent rounded-[8px] flex items-center justify-center text-white text-sm font-extrabold font-display flex-shrink-0">T</span>
          }
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight flex-1 truncate min-w-0">{adminName}</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[7px] transition-all flex-shrink-0"
          >
            <PortalIcon name="x" size={17} />
          </button>
        </div>
        {renderNav(true, onClose)}
      </div>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden print:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'hidden lg:flex flex-col bg-slate flex-shrink-0 overflow-hidden transition-[width] duration-200 print:hidden',
        expanded ? 'w-[228px]' : 'w-[64px]'
      )}>
        {renderDesktop()}
      </aside>

      <aside className={cn(
        'fixed top-0 left-0 h-full w-[268px] bg-slate z-40 flex flex-col lg:hidden transition-transform duration-200 ease-in-out overflow-hidden print:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {renderMobile()}
      </aside>
    </>
  )
}
