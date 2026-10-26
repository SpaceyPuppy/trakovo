import Link from 'next/link'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import ServicesPanel from './ServicesPanel'
import { getVehicles } from '@/lib/api'
import { FLEET_COLLECTIONS, matchesFleetCollection } from '@/lib/fleet-collections'
import { getVehicleImage } from '@/lib/utils'
import { queryOne } from '@/lib/db'
import { getTaxiBookingConfig } from '@/lib/taxi-booking'
import type { Vehicle } from '@/types'

export const revalidate = 0

export default async function HomePage() {
  const taxiConfig = await getTaxiBookingConfig()
  let vehicles: Vehicle[] = []
  try { vehicles = await getVehicles() } catch { /* show page without vehicles if DB unavailable */ }

  const heroRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'hero_image_path' LIMIT 1").catch(() => null)
  const hasHero = !!heroRow?.value

  return (
    <>
      <NavWrapper />

      {hasHero ? (
        /* ── HERO with uploaded image: 75% image / 25% services ── */
        <section className="bg-slate min-h-[72vh] flex flex-col md:flex-row relative overflow-hidden">
          {/* Left — hero image fills 75% */}
          <div className="relative w-full md:w-3/4 min-h-[56vw] md:min-h-[72vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/hero" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Right — services + CTA (25%) */}
          <div className="w-full md:w-1/4 bg-gradient-to-br from-[#1e2535] to-[#151b28] flex items-center justify-center px-6 py-10 md:py-16">
            <ServicesPanel compact taxiConfig={taxiConfig} />
          </div>
        </section>
      ) : (
        /* ── HERO default: dark gradient split ── */
        <section className="bg-slate min-h-[72vh] grid grid-cols-1 md:grid-cols-2 relative overflow-hidden">
          <div className="hero-noise" />

          <div className="px-6 py-12 md:px-16 md:py-20 flex flex-col justify-center relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-5 flex items-center gap-2">
              <span className="w-6 h-[2px] bg-accent inline-block" />
              Premium Vehicle Hire
            </p>
            <h1 className="font-display font-extrabold text-[clamp(36px,5vw,58px)] leading-[1.05] tracking-tight text-white mb-6">
              Drive on<br />your own<br /><em className="not-italic text-accent">terms.</em>
            </h1>
            <p className="text-[16px] text-white/60 font-light max-w-[400px] leading-[1.7] mb-10">
              Professional vehicle hire for business travel, events, and everyday use.
              Chauffeured or self-drive — your choice.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/vehicles" className="bg-accent text-white font-semibold text-[14px] px-7 py-3.5 rounded-[6px] hover:bg-accent-dark hover:-translate-y-px hover:shadow-lg transition-all inline-flex items-center gap-2">
                Book Now →
              </Link>
              <Link href="/vehicles" className="bg-emerald-700 text-white font-medium text-[14px] px-6 py-3.5 rounded-[6px] hover:bg-emerald-600 transition-colors">
                View Fleet
              </Link>
            </div>
            <div className="flex gap-6 md:gap-8 mt-8 md:mt-14 pt-6 md:pt-8 border-t border-white/10">
              {[[String(vehicles.length),'Vehicles available'],['24h','Response time'],['CBD','Based & serviced']].map(([num,lbl]) => (
                <div key={lbl}>
                  <p className="font-display font-bold text-[26px] text-white">{num}</p>
                  <p className="text-[12px] text-white/45 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — Service highlights */}
          <div className="relative bg-gradient-to-br from-[#1e2535] to-[#151b28] flex items-center justify-center px-6 py-10 md:px-10 md:py-16">
            <ServicesPanel taxiConfig={taxiConfig} />
          </div>
        </section>
      )}

      {/* Fleet categories */}
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-accent inline-block" />Our Fleet
          </p>
          <h2 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-10">Vehicles for every occasion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FLEET_COLLECTIONS.map(collection => {
              const matching = vehicles.filter(vehicle => vehicle.is_available && vehicle.public_bookings_enabled && matchesFleetCollection(vehicle, collection.id) && getVehicleImage(vehicle))
              const representative = matching.find(vehicle => vehicle.feature_on_homepage) ?? matching[0]
              const image = representative && getVehicleImage(representative)
              return <Link key={collection.id} href={`/vehicles?priority=${collection.id}`} className="group rounded-xl overflow-hidden border border-border bg-white shadow-card hover:shadow-card-lg hover:-translate-y-1 transition-all duration-200">
                <div className="relative h-[200px] bg-gradient-to-br from-slate to-ink flex items-center justify-center overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : <svg aria-hidden="true" width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
                    {collection.symbol === 'bus' ? <><rect x="9" y="7" width="30" height="31" rx="5" /><path d="M9 23h30M24 7v16M15 38v4m18-4v4M14 30h4m12 0h4" /></> : collection.symbol === 'car' ? <><path d="m8 26 5-13h22l5 13v10H8zM8 25h32M14 36v5m20-5v5M13 30h5m12 0h5" /></> : <><path d="m24 6 5.5 11 12.5 2-9 9 2 13-11-6-11 6 2-13-9-9 12.5-2z" /></>}
                  </svg>}
                </div>
                <div className="p-6">
                  <h3 className="font-display font-bold text-[21px] mb-3">{collection.label}</h3>
                  <p className="text-[14px] text-ink-3 leading-relaxed mb-5">{collection.description}</p>
                  <span className="text-[13px] font-semibold text-accent">Explore the fleet →</span>
                </div>
              </Link>
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/vehicles" className="bg-accent text-white font-semibold text-[14px] px-7 py-3.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-flex items-center gap-2">
              View Full Fleet →
            </Link>
          </div>
        </section>

      <Footer />
    </>
  )
}
