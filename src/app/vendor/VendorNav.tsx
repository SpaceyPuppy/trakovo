'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import PortalIcon, { type PortalIconName } from '@/components/ui/PortalIcon'

const navLinks: Array<{ href: string; label: string; icon: PortalIconName; exact?: boolean }> = [
  { href: '/vendor', label: 'Overview', icon: 'layout-dashboard', exact: true },
  { href: '/vendor/vehicles', label: 'Vehicles', icon: 'car-front' },
  { href: '/vendor/calendar', label: 'Calendar', icon: 'calendar-days' },
  { href: '/vendor/clients', label: 'Clients', icon: 'users' },
  { href: '/vendor/support', label: 'Support', icon: 'life-buoy' },
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
      <div className="px-4 sm:px-8 md:px-10 max-w-[1400px] mx-auto flex items-center gap-5 min-h-[70px]">
        <Link href="/vendor" className="flex items-center gap-2.5 flex-shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt={portalName} className="h-7 w-auto max-w-[82px] object-contain" />
            : <span className="w-8 h-8 bg-accent rounded-[8px] flex items-center justify-center text-white text-sm font-extrabold font-display">T</span>
          }
          <span className="font-display font-bold text-[15px] text-white tracking-tight hidden sm:block">{portalName}</span>
        </Link>

        <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto" aria-label="Vendor navigation">
          {navLinks.map(({ href, label, icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-[8px] text-[12.5px] font-medium transition-all whitespace-nowrap',
                  active ? 'bg-white/[0.10] text-white shadow-[inset_0_-2px_0_#f06a24]' : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                <PortalIcon name={icon} size={16} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0 pl-3 border-l border-white/10">
          <div className="hidden md:block text-right max-w-[160px]">
            <span className="block text-[12px] text-white/80 font-semibold truncate">{vendorName}</span>
            <span className="block text-[10px] text-white/40 mt-0.5">Vendor account</span>
          </div>
          <button onClick={logout} aria-label="Sign out" className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white transition-colors font-medium px-2 py-1.5 rounded-[7px] hover:bg-white/[0.06]">
            <PortalIcon name="log-out" size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
