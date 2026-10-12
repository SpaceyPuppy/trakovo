'use client'

import { useState } from 'react'
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
      <a href="/book/taxi" className={className} onClick={event => {
        if (config.onlineBookingEnabled || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        setOpen(true)
      }}>{children}</a>
      {!config.onlineBookingEnabled && <TaxiCallDialog config={config} open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
