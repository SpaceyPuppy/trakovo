'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/vendor', label: 'Dashboard', exact: true },
  { href: '/vendor/bookings', label: 'Bookings' },
  { href: '/vendor/calendar', label: 'Calendar' },
  { href: '/vendor/clients', label: 'Clients' },
  { href: '/vendor/support', label: 'Support' },
]

export default function VendorNav({ vendorName, portalName = 'Hire Manager', logoUrl }: { vendorName: string; portalName?: string; logoUrl?: string }) {
  const path = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/vendor/logout', { method: 'POST' })
    router.push('/vendor/login')
  }

  return (
    <header className="bg-slate border-b border-white/10 sticky top-0 z-30">
      <div className="px-4 sm:px-8 md:px-10 max-w-[1400px] flex items-center gap-4 h-14">
        {/* Brand */}
        <Link href="/vendor" className="flex items-center gap-2.5 flex-shrink-0 mr-4">
          {logoUrl
            ? <img src={logoUrl} alt={portalName} className="h-7 w-auto max-w-[80px] object-contain" />
            : <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold font-display">V</span>
          }
          <span className="font-display font-extrabold text-[15px] text-white tracking-tight hidden sm:block">
            {portalName}
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navLinks.map(({ href, label, exact }) => {
            const active = exact ? path === href : path.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn('px-3 py-2.5 rounded-[6px] text-[13.5px] font-medium transition-all', active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')}>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-[13px] text-white/50 hidden md:block font-medium">{vendorName}</span>
          <button onClick={logout}
            className="text-[13px] text-white/40 hover:text-white transition-colors font-medium px-2 py-1">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
