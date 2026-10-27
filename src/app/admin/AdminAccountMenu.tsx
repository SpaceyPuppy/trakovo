'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import PortalIcon from '@/components/ui/PortalIcon'

export default function AdminAccountMenu({ username, compact = false, onOpen }: { username: string; compact?: boolean; onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const router = useRouter()
  const parts = username.trim().split(/\s+/)
  const initials = parts.length >= 2 ? (parts[0][0] + parts.at(-1)![0]).toUpperCase() : username.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  async function logout() {
    if (signingOut) return
    setSigningOut(true); setError('')
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed. Please try again.')
      setOpen(false)
      setSigningOut(false)
      router.replace('/admin/login')
      router.refresh()
    } catch { setError('Unable to sign out. Please try again.'); setSigningOut(false) }
  }

  const close = () => setOpen(false)
  return <div ref={container} className="relative">
    <button ref={trigger} type="button" aria-label="Account menu" aria-expanded={open} aria-controls={id} onClick={() => {
      if (!open) onOpen?.()
      setOpen(current => !current)
    }} className={compact ? 'w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold select-none' : `flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] border transition-all ${open ? 'bg-bg border-border' : 'border-transparent hover:bg-bg'}`}>
      <span className={compact ? '' : 'w-8 h-8 rounded-full bg-[#273d5f] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 select-none'}>{initials}</span>
      {!compact && <><span className="text-left hidden xl:block max-w-[140px] truncate"><span className="block text-[12px] font-semibold text-ink truncate">{username}</span><span className="block text-[10px] text-ink-3 mt-0.5">Administrator</span></span><PortalIcon name="chevron-down" size={15} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} /></>}
    </button>
    {open && <div id={id} role="region" aria-label="Account options" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[236px] max-w-[calc(100vw-32px)] bg-white border border-border rounded-[10px] shadow-card-lg overflow-hidden text-ink">
      <div className="px-4 py-3 border-b border-border"><p className="text-[13.5px] font-bold truncate">{username}</p><p className="text-[11px] text-ink-3 mt-0.5">Administrator</p></div>
      <div className="p-1.5 space-y-0.5">
        <Link href="/admin/settings" onClick={close} className="flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium hover:bg-bg"><PortalIcon name="settings-2" size={16} />Settings</Link>
        <Link href="/admin/profile" onClick={close} className="flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium hover:bg-bg"><PortalIcon name="users" size={16} />Profile settings</Link>
        <Link href="/" target="_blank" rel="noopener noreferrer" onClick={close} className="flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium hover:bg-bg"><PortalIcon name="arrow-up-right" size={16} />View site</Link>
        <div className="h-px bg-border my-1" />
        {error && <p role="alert" className="px-3 py-1 text-[12px] text-red-700">{error}</p>}
        <button type="button" disabled={signingOut} onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 text-left"><PortalIcon name="log-out" size={16} />{signingOut ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </div>}
  </div>
}
