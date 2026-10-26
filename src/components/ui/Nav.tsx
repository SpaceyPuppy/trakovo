'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OCCASIONS } from '@/lib/special-occasions'

interface NavProps {
  logoUrl?: string
  siteName?: string
}

export default function Nav({ logoUrl, siteName = 'Trakovo' }: NavProps) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [occasionsOpen, setOccasionsOpen] = useState(false)
  const [mobileOccasionsOpen, setMobileOccasionsOpen] = useState(false)
  const occasionsMenu = useRef<HTMLDivElement>(null)
  const mobileOccasionsMenu = useRef<HTMLDivElement>(null)
  const occasionsLink = useRef<HTMLAnchorElement>(null)
  const mobileOccasionsLink = useRef<HTMLAnchorElement>(null)
  const lastPointerType = useRef('mouse')

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!occasionsMenu.current?.contains(event.target as Node)
        && !mobileOccasionsMenu.current?.contains(event.target as Node)) {
        setOccasionsOpen(false)
        setMobileOccasionsOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (occasionsOpen) {
          setOccasionsOpen(false)
          occasionsLink.current?.focus()
        } else if (mobileOccasionsOpen) {
          setMobileOccasionsOpen(false)
          mobileOccasionsLink.current?.focus()
        } else setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [occasionsOpen, mobileOccasionsOpen])

  const navLinks = [
    { href: '/special-occasions', label: 'Special Occasions', active: path.startsWith('/special-occasions') },
    { href: '/services#professional-services', label: 'Corporate Events', active: false },
    { href: '/services', label: 'Services', active: path.startsWith('/services') },
    { href: '/vehicles', label: 'Our Fleet', active: path.startsWith('/vehicles') },
    { href: '/contact', label: 'Contact', active: path.startsWith('/contact') },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-border h-[60px] flex items-center justify-between px-4 md:px-10">
        {/* Logo */}
        <Link href="/" onClick={() => setOpen(false)} title={siteName} className="font-display font-extrabold text-[18px] tracking-tight text-ink flex items-center gap-2 min-w-0 max-w-[200px] xl:max-w-[360px] shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Site logo" className="h-8 w-auto object-contain max-w-[160px]" />
          ) : (
            <>
              <span className="w-7 h-7 shrink-0 bg-accent rounded-[4px] flex items-center justify-center text-white text-sm font-extrabold">A</span>
              <span className="hidden sm:inline truncate">{siteName}</span>
            </>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-8 whitespace-nowrap shrink-0">
          <div ref={occasionsMenu} className="relative flex items-center" onPointerEnter={event => {
            if (event.pointerType === 'mouse') setOccasionsOpen(true)
          }} onPointerLeave={event => {
            if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) setOccasionsOpen(false)
          }} onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setOccasionsOpen(false)
          }}>
            <Link ref={occasionsLink} href="/special-occasions" aria-expanded={occasionsOpen} aria-controls="occasions-links" className={cn('text-[13.5px] font-medium transition-colors', path.startsWith('/special-occasions') ? 'text-ink' : 'text-ink-3 hover:text-ink')} onPointerDown={event => { lastPointerType.current = event.pointerType }} onClick={event => {
              if (lastPointerType.current !== 'mouse' && event.detail !== 0 && !occasionsOpen) {
                event.preventDefault()
                setOccasionsOpen(true)
              } else setOccasionsOpen(false)
            }}>
              Special Occasions
            </Link>
            <button type="button" aria-label="Special Occasions options" aria-expanded={occasionsOpen} aria-controls="occasions-links" onClick={() => setOccasionsOpen(value => !value)} className="p-2 text-ink-3 rounded focus-visible:outline-accent">
              <span aria-hidden="true">⌄</span>
            </button>
            {occasionsOpen && <div id="occasions-links" className="absolute top-full left-0 w-56 rounded-xl border border-border bg-white shadow-card-lg p-2">
              {OCCASIONS.map(occasion => <Link key={occasion.id} href={`/special-occasions#${occasion.id}`} onClick={() => setOccasionsOpen(false)} className="block px-3 py-2.5 rounded-md text-[13.5px] text-ink-2 hover:bg-bg focus-visible:outline-accent">{occasion.label}</Link>)}
            </div>}
          </div>
          {navLinks.slice(1).map(({ href, label, active }) => (
            <Link key={href} href={href} className={cn('text-[13.5px] font-medium transition-colors', active ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
              {label}
            </Link>
          ))}
          <Link href="/vehicles" className="bg-ink text-white text-[13.5px] font-semibold px-5 py-2 rounded-[6px] hover:bg-slate transition-colors">
            View Fleet
          </Link>
        </div>

        {/* Mobile: Book CTA + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          <Link href="/vehicles" className="bg-accent text-white text-[13px] font-semibold px-4 py-2 rounded-[6px]">
            Book
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-[6px] text-ink-2 hover:bg-bg transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
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
        <div id="public-mobile-menu" className="lg:hidden fixed inset-0 top-[60px] z-40 bg-white border-t border-border flex flex-col">
          <div className="px-4 py-5 flex-1 space-y-1 overflow-y-auto">
            {navLinks.map(({ href, label, active }) => (
              <div key={href} ref={href === '/special-occasions' ? mobileOccasionsMenu : undefined}>
              <Link
                ref={href === '/special-occasions' ? mobileOccasionsLink : undefined}
                href={href}
                aria-expanded={href === '/special-occasions' ? mobileOccasionsOpen : undefined}
                aria-controls={href === '/special-occasions' ? 'mobile-occasions-links' : undefined}
                onClick={event => {
                  if (href === '/special-occasions' && !mobileOccasionsOpen) {
                    event.preventDefault()
                    setMobileOccasionsOpen(true)
                  } else {
                    setMobileOccasionsOpen(false)
                    setOpen(false)
                  }
                }}
                className={cn(
                  'flex items-center py-4 px-4 rounded-[10px] text-[16px] font-medium transition-colors',
                  active ? 'bg-bg text-ink font-semibold' : 'text-ink-2 hover:bg-bg'
                )}
              >
                {label}{href === '/special-occasions' && <span aria-hidden="true" className="ml-auto">{mobileOccasionsOpen ? '⌃' : '⌄'}</span>}
              </Link>
              {href === '/special-occasions' && mobileOccasionsOpen && <div id="mobile-occasions-links" className="pl-7 pb-2 space-y-1">
                {OCCASIONS.map(occasion => <Link key={occasion.id} href={`/special-occasions#${occasion.id}`} onClick={() => { setMobileOccasionsOpen(false); setOpen(false) }} className="block rounded-md px-3 py-2 text-[14px] text-ink-3 hover:bg-bg">{occasion.label}</Link>)}
              </div>}
              </div>
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
