'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/admin/settings', label: 'General', icon: '⚙' },
  { href: '/admin/settings/templates', label: 'Email Templates', icon: '✉' },
  { href: '/admin/settings/connections', label: 'Connections', icon: '🔗' },
  { href: '/admin/settings/booking-app', label: 'Booking App', icon: '📱' },
  { href: '/admin/settings/dispatch', label: 'Dispatch', icon: '⚡' },
  { href: '/admin/settings/updates', label: 'Updates', icon: '↑' },
]

export default function SettingsNav() {
  const path = usePathname()

  return (
    <nav className="w-[180px] shrink-0 sticky top-10 space-y-0.5">
      {nav.map(({ href, label, icon }) => {
        const active = href === '/admin/settings'
          ? path === '/admin/settings'
          : path.startsWith(href)
        return (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all',
              active
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-ink-3 hover:text-ink hover:bg-black/5'
            )}>
            <span className="w-4 text-center text-[13px]">{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
