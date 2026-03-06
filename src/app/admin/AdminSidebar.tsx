'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const SETTINGS_CHILDREN = [
  { href: '/admin/settings', label: 'General', exact: true },
  { href: '/admin/settings/templates', label: 'Email Templates' },
  { href: '/admin/settings/connections', label: 'Connections' },
  { href: '/admin/settings/booking-app', label: 'Booking App' },
  { href: '/admin/settings/updates', label: 'Updates' },
]

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '⊞', exact: true, children: undefined },
  { href: '/admin/vehicles', label: 'Vehicles', icon: '🚗', exact: false, children: undefined },
  { href: '/admin/bookings', label: 'Bookings', icon: '📋', exact: false, children: undefined },
  { href: '/admin/vendors', label: 'Vendors', icon: '🏢', exact: false, children: undefined },
  { href: '/admin/drivers', label: 'Drivers', icon: '🚘', exact: false, children: undefined },
  { href: '/admin/users', label: 'Users', icon: '👤', exact: false, children: undefined },
  { href: '/admin/settings', label: 'Settings', icon: '⚙', exact: false, children: SETTINGS_CHILDREN },
]

interface Props {
  adminName: string
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

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150', open && 'rotate-180')}>
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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

export default function AdminSidebar({ adminName, expanded, mobileOpen, onToggle, onClose }: Props) {
  const path = usePathname()
  const router = useRouter()
  const inSettings = path.startsWith('/admin/settings')
  const [settingsOpen, setSettingsOpen] = useState(inSettings)

  useEffect(() => {
    if (inSettings) setSettingsOpen(true)
  }, [inSettings])

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  function renderContent(exp: boolean, isMobile: boolean) {
    return (
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className={cn('h-14 flex items-center border-b border-white/10 flex-shrink-0', exp ? 'px-3 gap-2' : 'px-2 justify-center')}>
          {exp ? (
            <>
              <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display flex-shrink-0">A</span>
              <span className="font-display font-extrabold text-[15px] text-white tracking-tight flex-1 truncate min-w-0">{adminName}</span>
              <button
                onClick={isMobile ? onClose : onToggle}
                aria-label={isMobile ? 'Close menu' : 'Collapse sidebar'}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[5px] transition-all flex-shrink-0"
              >
                {isMobile ? <IconX /> : <IconCollapse />}
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              aria-label="Expand sidebar"
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-[5px] transition-all"
            >
              <IconExpand />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = item.exact ? path === item.href : path.startsWith(item.href)
            const hasChildren = Boolean(item.children?.length)

            const itemClass = cn(
              'flex items-center rounded-[6px] text-[13.5px] font-medium transition-all',
              exp ? 'gap-2.5 px-3 py-2.5' : 'justify-center py-2.5 px-2',
              isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
            )

            const iconEl = (
              <span className={cn('text-base flex-shrink-0', !exp && 'w-5 text-center')}>{item.icon}</span>
            )

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button
                    onClick={() => {
                      if (!exp) {
                        onToggle()
                        setSettingsOpen(true)
                        router.push(item.href)
                      } else {
                        setSettingsOpen(o => !o)
                      }
                    }}
                    className={cn(itemClass, 'w-full')}
                    title={!exp ? item.label : undefined}
                  >
                    {iconEl}
                    {exp && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <IconChevron open={settingsOpen} />
                      </>
                    )}
                  </button>
                ) : (
                  <Link href={item.href} onClick={onClose} className={itemClass} title={!exp ? item.label : undefined}>
                    {iconEl}
                    {exp && <span>{item.label}</span>}
                  </Link>
                )}

                {/* Settings sub-items */}
                {hasChildren && exp && settingsOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                    {item.children!.map(child => {
                      const childActive = child.exact ? path === child.href : path.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all',
                            childActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
          <Link
            href="/"
            target="_blank"
            onClick={onClose}
            className={cn('flex items-center rounded-[6px] text-[13.5px] font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all', exp ? 'gap-2.5 px-3 py-2.5' : 'justify-center py-2.5 px-2')}
            title={!exp ? 'View Site' : undefined}
          >
            <span className={cn('text-base', !exp && 'w-5 text-center')}>↗</span>
            {exp && 'View Site'}
          </Link>
          <button
            onClick={logout}
            className={cn('w-full flex items-center rounded-[6px] text-[13.5px] font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all', exp ? 'gap-2.5 px-3 py-2.5' : 'justify-center py-2.5 px-2')}
            title={!exp ? 'Sign Out' : undefined}
          >
            <span className={cn('text-base', !exp && 'w-5 text-center')}>⏏</span>
            {exp && 'Sign Out'}
          </button>
        </div>

      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Desktop sidebar — in flex flow, always visible on lg+, collapsible */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-slate flex-shrink-0 h-screen sticky top-0 transition-[width] duration-200 overflow-hidden',
        expanded ? 'w-[220px]' : 'w-[60px]'
      )}>
        {renderContent(expanded, false)}
      </aside>

      {/* Mobile drawer — fixed overlay, slides in from left */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-[260px] bg-slate z-40 flex flex-col lg:hidden transition-transform duration-200 ease-in-out overflow-hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {renderContent(true, true)}
      </aside>
    </>
  )
}
