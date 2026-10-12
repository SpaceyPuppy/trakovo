'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { TaxiBookingConfig } from '@/lib/taxi-booking-config'

interface Props {
  config: TaxiBookingConfig
  open: boolean
  onClose: () => void
}

export default function TaxiCallDialog({ config, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    else if (!open && dialog?.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="taxi-call-title"
      className="w-[calc(100%-2rem)] max-w-[420px] rounded-2xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60"
      onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close() }}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="taxi-call-title" className="font-display font-bold text-[24px] tracking-tight">Call to book your taxi</h2>
          <button type="button" onClick={onClose} aria-label="Close taxi booking dialog"
            className="rounded-md px-2 py-1 text-ink-3 hover:bg-bg focus-visible:outline-accent">✕</button>
        </div>
        <p className="text-[14px] leading-relaxed text-ink-3 mb-6">
          Our taxi service is available for local and regional trips. Call our team to arrange your pickup.
        </p>
        {config.phoneHref ? (
          <a href={config.phoneHref} className="flex flex-col items-center gap-1 rounded-xl bg-accent px-5 py-4 text-center text-white hover:bg-accent-dark focus-visible:outline-ink">
            <span className="text-[12px] font-semibold">Call taxi bookings</span>
            <span className="font-display text-[25px] font-bold">{config.phone}</span>
          </a>
        ) : (
          <Link href="/contact" className="block rounded-xl bg-accent px-5 py-4 text-center font-semibold text-white hover:bg-accent-dark">
            Contact our team to arrange a taxi
          </Link>
        )}
      </div>
    </dialog>
  )
}
