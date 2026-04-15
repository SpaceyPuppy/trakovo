'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavProps {
  logoUrl?: string
  siteName?: string
}

export default function Nav({ logoUrl, siteName = 'Trakovo' }: NavProps) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: '/vehicles', label: 'Our Fleet', active: path.startsWith('/vehicles') },
    { href: '/services', label: 'About', active: path.startsWith('/services') },
    { href: '/contact', label: 'Contact', active: path.startsWith('/contact') },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-border h-[60px] flex items-center justify-between px-4 md:px-10">
        {/* Logo */}
        <Link href="/" onClick={() => setOpen(false)} className="font-display font-extrabold text-[18px] tracking-tight text-ink flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Site logo" className="h-8 w-auto object-contain max-w-[160px]" />
          ) : (
            <>
              <span className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold">A</span>
              <span className="hidden sm:inline">{siteName}</span>
            </>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label, active }) => (
            <Link key={href} href={href} className={cn('text-[13.5px] font-medium transition-colors', active ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
              {label}
            </Link>
          ))}
          <Link href="/vehicles" className="bg-ink text-white text-[13.5px] font-semibold px-5 py-2 rounded-[6px] hover:bg-slate transition-colors">
            View Fleet
          </Link>
        </div>

        {/* Mobile: Book CTA + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/vehicles" className="bg-accent text-white text-[13px] font-semibold px-4 py-2 rounded-[6px]">
            Book
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-[6px] text-ink-2 hover:bg-bg transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 top-[60px] z-40 bg-white border-t border-border flex flex-col">
          <div className="px-4 py-5 flex-1 space-y-1 overflow-y-auto">
            {navLinks.map(({ href, label, active }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center py-4 px-4 rounded-[10px] text-[16px] font-medium transition-colors',
                  active ? 'bg-bg text-ink font-semibold' : 'text-ink-2 hover:bg-bg'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="px-4 pb-10 border-t border-border pt-5 space-y-3">
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full bg-accent text-white text-[15px] font-bold py-4 rounded-[10px] gap-2"
            >
              📱 Mobile Booking App
            </Link>
            <Link
              href="/vehicles"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full bg-ink text-white text-[15px] font-bold py-4 rounded-[10px]"
            >
              View Our Fleet →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
