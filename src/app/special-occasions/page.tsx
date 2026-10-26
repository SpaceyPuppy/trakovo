import type { Metadata } from 'next'
import Link from 'next/link'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import { getVehicles } from '@/lib/api'
import { OCCASIONS } from '@/lib/special-occasions'
import { occasionEnquiryVehicles, showcaseVehicles } from '@/lib/vehicle-showcase'
import { getVehicleImage } from '@/lib/utils'
import OccasionEnquiryForm from './OccasionEnquiryForm'

export const revalidate = 0
export const metadata: Metadata = {
  title: 'Special Occasions | Weddings, Deb Balls & Formals',
  description: 'Enquire about classic and luxury vehicles for weddings, debutante balls, school formals, graduations and special celebrations. Tailored transport, subject to availability.',
}

export default async function SpecialOccasionsPage({ searchParams }: {
  searchParams: Promise<{ vehicle?: string }>
}) {
  const requestedVehicle = (await searchParams).vehicle
  const publicVehicles = await getVehicles().catch(() => [])
  const vehicles = showcaseVehicles(publicVehicles, 'show_on_special_occasions')
  const enquiryVehicles = occasionEnquiryVehicles(publicVehicles)
  const selectedVehicle = enquiryVehicles.find(vehicle => vehicle.id === requestedVehicle)

  return <>
    <NavWrapper />
    <main>
      <section className="bg-slate relative overflow-hidden">
        <div className="hero-noise" />
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-16 md:py-24 relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-5">Special Occasions</p>
          <h1 className="font-display font-extrabold text-[clamp(34px,5vw,58px)] leading-[1.08] tracking-tight text-white max-w-[720px] mb-6">A memorable arrival.<br />A journey to celebrate.</h1>
          <p className="text-[16px] text-white/70 leading-[1.8] max-w-[600px] mb-8">Classic and luxury vehicles on enquiry for weddings, debutante balls, school formals, graduations and life's special celebrations.</p>
          <a href="#enquiry" className="inline-flex rounded-md bg-accent text-white px-7 py-3.5 text-[14px] font-semibold hover:bg-accent-dark">Enquire about your occasion →</a>
          <p className="text-[12px] text-white/55 mt-4">Vehicle selection and arrangements are subject to availability and confirmation.</p>
        </div>
      </section>

      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">Made for your moment</p>
        <h2 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-4">Transport for the occasion you have in mind.</h2>
        <p className="text-ink-3 text-[15px] leading-relaxed max-w-[720px] mb-10">Tell us about your plans, your party and the style of vehicle you would like. We can discuss classic and luxury options, chauffeured arrivals and transport for your guests, with a quote tailored to your requirements.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OCCASIONS.map((occasion, index) => <article key={occasion.id} id={occasion.id} className="scroll-mt-20 rounded-xl bg-white border border-border p-6">
            <p aria-hidden="true" className="text-accent font-display font-bold text-[12px] mb-5">0{index + 1}</p>
            <h3 className="font-display font-bold text-[19px] mb-3">{occasion.label}</h3>
            <p className="text-[14px] text-ink-3 leading-[1.8]">{occasion.description}</p>
            <a href="#enquiry" className="inline-block text-accent font-semibold text-[13px] mt-5">Discuss your plans →</a>
          </article>)}
          <article className="rounded-xl bg-ink text-white p-6">
            <p className="text-[11px] uppercase tracking-wider text-white/55 mb-5">For your organisation</p>
            <h3 className="font-display font-bold text-[19px] mb-3">Corporate Functions & Events</h3>
            <p className="text-[14px] text-white/65 leading-[1.8]">Planning a conference, gala, awards night or business function? Explore our professional transport services and discuss your event requirements.</p>
            <Link href="/services#professional-services" className="inline-block text-white font-semibold text-[13px] mt-5">Explore corporate events →</Link>
          </article>
        </div>
      </section>

      {vehicles.length > 0 && <section className="bg-bg border-y border-border">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">Selected vehicles</p>
          <h2 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-4">Find your style.</h2>
          <p className="text-[14px] text-ink-3 mb-8">A selection from our fleet. Enquire about suitability, availability and a quote for your event.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map(vehicle => <article key={vehicle.id} className="rounded-xl overflow-hidden border border-border bg-white shadow-card">
              <div className="h-[210px] bg-slate flex items-center justify-center">
                {getVehicleImage(vehicle) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getVehicleImage(vehicle)!} alt={vehicle.name} className="w-full h-full object-cover" />
                ) : <span className="text-white/60 text-[14px]">Photo to follow</span>}
              </div>
              <div className="p-6">
                <h3 className="font-display font-bold text-[19px] mb-2">{vehicle.name}</h3>
                {vehicle.meta.passengers && <p className="text-[13px] text-ink-3 mb-4">Up to {vehicle.meta.passengers} passengers</p>}
                <Link href={`/special-occasions?vehicle=${encodeURIComponent(vehicle.id)}#enquiry`} className="inline-block rounded-md bg-ink text-white text-[13px] font-semibold px-4 py-2.5">Enquire about this vehicle →</Link>
              </div>
            </article>)}
          </div>
        </div>
      </section>}

      <section id="enquiry" className="scroll-mt-20 max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">Let's plan your journey</p>
            <h2 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-5">Tell us about your occasion.</h2>
            <p className="text-[15px] text-ink-3 leading-[1.8] mb-6">Share your date, locations, passenger numbers and any vehicle preferences. We'll discuss suitable options and prepare a personalised quote.</p>
            <p className="text-[14px] text-ink-3 leading-[1.8]">Your enquiry helps us explore the right arrangements. A booking is confirmed only once the vehicle, itinerary and pricing have been agreed with our team.</p>
          </div>
          <OccasionEnquiryForm key={selectedVehicle?.id ?? 'any-vehicle'} vehicles={enquiryVehicles.map(vehicle => ({ id: vehicle.id, name: vehicle.name }))} initialVehicleId={selectedVehicle?.id ?? ''} />
        </div>
      </section>
    </main>
    <Footer />
  </>
}
