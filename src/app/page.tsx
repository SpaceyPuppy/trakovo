import Link from 'next/link'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import VehicleCard from '@/components/ui/VehicleCard'
import { getVehicles } from '@/lib/api'
import { queryOne } from '@/lib/db'
import type { Vehicle } from '@/types'

export const revalidate = 0 // ISR — revalidate every 60s

const SERVICES = [
  { icon: '🤵', title: 'Chauffeured Hire', desc: 'Professional drivers for executive travel, airports, and special events.' },
  { icon: '🔑', title: 'Self-Drive (Dry Hire)', desc: 'Take the wheel on your own schedule with full day-to-day flexibility.' },
  { icon: '🏢', title: 'Corporate & Events', desc: 'Tailored solutions for businesses, conferences, and group bookings.' },
]

export default async function HomePage() {
  let vehicles: Vehicle[] = []
  try { vehicles = await getVehicles() } catch { /* show page without vehicles if DB unavailable */ }

  const heroRow = await queryOne<{ value: string }>("SELECT value FROM Setting WHERE `key` = 'hero_image_path' LIMIT 1").catch(() => null)
  const hasHero = !!heroRow?.value

  const preview = vehicles.slice(0, 3)

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
            <div className="w-full space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-4">Our Services</p>
              {SERVICES.map(({ icon, title, desc }) => (
                <div key={title} className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.09] rounded-xl px-4 py-3.5 text-white transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-[20px] flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="font-display font-bold text-[13px] mb-0.5">{title}</p>
                      <p className="text-[11.5px] text-white/45 leading-[1.5]">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/vehicles" className="bg-accent text-white font-semibold text-[13.5px] px-5 py-3 rounded-[6px] hover:bg-accent-dark transition-colors text-center">
                  Book Now →
                </Link>
                <Link href="/vehicles" className="border border-white/20 text-white/75 font-medium text-[13.5px] px-5 py-3 rounded-[6px] hover:border-white/50 hover:text-white transition-all text-center">
                  View Fleet
                </Link>
              </div>
            </div>
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
              <Link href="/vehicles" className="border border-white/20 text-white/75 font-medium text-[14px] px-6 py-3.5 rounded-[6px] hover:border-white/50 hover:text-white transition-all">
                View Fleet
              </Link>
            </div>
            <div className="flex gap-6 md:gap-8 mt-8 md:mt-14 pt-6 md:pt-8 border-t border-white/10">
              {[['8','Vehicles available'],['24h','Response time'],['CBD','Based & serviced']].map(([num,lbl]) => (
                <div key={lbl}>
                  <p className="font-display font-bold text-[26px] text-white">{num}</p>
                  <p className="text-[12px] text-white/45 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — Service highlights */}
          <div className="relative bg-gradient-to-br from-[#1e2535] to-[#151b28] flex items-center justify-center px-6 py-10 md:px-10 md:py-16">
            <div className="w-full max-w-[340px] space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-4">Our Services</p>
              {SERVICES.map(({ icon, title, desc }) => (
                <div key={title} className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.09] rounded-xl px-5 py-4 text-white transition-colors">
                  <div className="flex items-start gap-3.5">
                    <span className="text-[22px] flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="font-display font-bold text-[14px] mb-1">{title}</p>
                      <p className="text-[12px] text-white/45 leading-[1.55]">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fleet preview */}
      {preview.length > 0 && (
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-accent inline-block" />Our Fleet
          </p>
          <h2 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-10">Vehicles for every occasion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {preview.map(v => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
          <div className="text-center mt-8">
            <Link href="/vehicles" className="bg-accent text-white font-semibold text-[14px] px-7 py-3.5 rounded-[6px] hover:bg-accent-dark transition-colors inline-flex items-center gap-2">
              View Full Fleet →
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </>
  )
}
