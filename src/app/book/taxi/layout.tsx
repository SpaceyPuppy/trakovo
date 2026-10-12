import Link from 'next/link'
import type { Metadata } from 'next'
import { getTaxiBookingConfig } from '@/lib/taxi-booking'
import TaxiBookingLink from '@/components/book/TaxiBookingLink'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTaxiBookingConfig()
  return {
    title: 'Taxi Bookings',
    description: config.onlineBookingEnabled
      ? 'Book a taxi for local and regional travel.'
      : `Taxi services are available for local and regional travel. ${config.phoneHref ? `Call ${config.phone} to book your taxi.` : 'Contact our team to book your taxi.'}`,
  }
}

export default async function TaxiLayout({ children }: { children: React.ReactNode }) {
  const config = await getTaxiBookingConfig()
  if (config.onlineBookingEnabled) return children

  // Guard every taxi URL, including bookmarked destination/confirmation screens.
  // The online flow and its map/geolocation components are not mounted in phone mode.
  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center px-6 py-12 text-center">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-accent">Taxi service</p>
      <h1 className="font-display text-[32px] font-bold tracking-tight text-ink">Book your taxi by phone</h1>
      <p className="my-5 text-[15px] leading-relaxed text-ink-3">Local and regional taxi services are available. Call our team to arrange your pickup.</p>
      {config.phoneHref && <a href={config.phoneHref} className="mb-5 font-display text-[28px] font-bold text-accent">{config.phone}</a>}
      <TaxiBookingLink config={config} autoOpen className="rounded-xl bg-ink px-5 py-4 font-semibold text-white">Contact taxi bookings</TaxiBookingLink>
      <Link href="/book" className="mt-6 text-[14px] font-semibold text-ink-3 underline">Back to ride picker</Link>
    </main>
  )
}
