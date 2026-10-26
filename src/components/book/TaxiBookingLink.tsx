'use client'

import { useState } from 'react'
import Link from 'next/link'
import TaxiCallDialog from './TaxiCallDialog'
import type { TaxiBookingConfig } from '@/lib/taxi-booking-config'

interface Props {
  config: TaxiBookingConfig
  children: React.ReactNode
  className?: string
  autoOpen?: boolean
}

export default function TaxiBookingLink({ config, children, className, autoOpen = false }: Props) {
  const [open, setOpen] = useState(autoOpen)

  return (
    <>
      <Link href="/book/taxi" className={className} prefetch={config.onlineBookingEnabled} onClick={event => {
        if (config.onlineBookingEnabled || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        setOpen(true)
      }}>{children}</Link>
      {!config.onlineBookingEnabled && <TaxiCallDialog config={config} open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
