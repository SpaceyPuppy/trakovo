'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: '◻' },
  { href: '/admin/vehicles', label: 'Vehicles', icon: '🚗' },
  { href: '/admin/bookings', label: 'Bookings', icon: '📋' },
  { href: '/admin/vendors', label: 'Vendors', icon: '🏢' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' },
]

export default function AdminSidebar() {
  const path = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <aside className="w-[220px] bg-slate flex flex-col flex-shrink-0 min-h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display">A</span>
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight">{process.env.NEXT_PUBLIC_ADMIN_NAME ?? 'Hire Manager'}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon }) => {
          const active = path === href || (href !== '/admin' && path.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium transition-all', active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')}>
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link href="/" target="_blank"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <span className="text-base w-5 text-center">↗</span> View Site
        </Link>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <span className="text-base w-5 text-center">⏏</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
