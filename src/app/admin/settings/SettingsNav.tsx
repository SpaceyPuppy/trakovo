'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/admin/settings', label: 'General' },
  { href: '/admin/settings/templates', label: 'Email Templates' },
  { href: '/admin/settings/connections', label: 'Connections' },
  { href: '/admin/settings/booking-app', label: 'Booking App' },
  { href: '/admin/settings/dispatch', label: 'Dispatch' },
  { href: '/admin/settings/updates', label: 'Updates' },
]

export default function SettingsNav() {
  const path = usePathname()

  return (
    <div className="flex gap-0 overflow-x-auto -mx-4 px-4 sm:-mx-10 sm:px-10 border-b border-black/8 mb-8">
      {nav.map(({ href, label }) => {
        const active = href === '/admin/settings'
          ? path === '/admin/settings'
          : path.startsWith(href)
        return (
          <Link key={href} href={href}
            className={cn(
              'shrink-0 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-black/20'
            )}>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
