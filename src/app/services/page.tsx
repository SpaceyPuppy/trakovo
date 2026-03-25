import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import CorporateEnquiryForm from './CorporateEnquiryForm'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'From chauffeured hire and self-drive to professional business transport — explore the full range of services we offer.',
}

const SERVICE_TYPES = [
  {
    icon: '🤵',
    title: 'Chauffeured Hire',
    desc: 'Professional drivers for executive travel, airport transfers, and special occasions. Sit back and travel in comfort while we handle the journey.',
    href: '/vehicles?hire=chauffeur',
    comingSoon: false,
    cta: 'Browse vehicles →',
  },
  {
    icon: '🔑',
    title: 'Self-Drive (Dry Hire)',
    desc: 'Take the wheel yourself. Choose from our fleet for day hire, weekend getaways, or extended rental — fully flexible on your schedule.',
    href: '/vehicles?hire=selfdrive',
    comingSoon: false,
    cta: 'Browse vehicles →',
  },
  {
    icon: '🚕',
    title: 'Taxi',
    desc: 'On-demand taxi bookings for local and regional trips. Available soon through our updated booking platform.',
    href: null,
    comingSoon: true,
    cta: null,
  },
  {
    icon: '🚗',
    title: 'Rideshare',
    desc: 'Shared ride options for cost-effective everyday travel. Coming soon as part of our expanded transport network.',
    href: null,
    comingSoon: true,
    cta: null,
  },
  {
    icon: '🏢',
    title: 'Professional Services',
    desc: 'Tailored corporate transport for businesses, conferences, delegations, and events. Account-based billing with priority availability.',
    href: '#professional-services',
    comingSoon: false,
    cta: 'Learn more →',
  },
]

const OFFERINGS = [
  {
    icon: '✈️',
    title: 'Executive & Airport Transfers',
    desc: 'Reliable, punctual transfers for executives, VIPs, and business travellers. Meet-and-greet service, flight monitoring, and seamless door-to-door logistics.',
  },
  {
    icon: '🏛️',
    title: 'Conferences & Corporate Events',
    desc: "Coordinated multi-vehicle transport for conferences, product launches, and corporate retreats. We manage scheduling, routing, and on-the-day logistics so you don't have to.",
  },
  {
    icon: '👥',
    title: 'Group & Delegation Transport',
    desc: 'From board delegations to staff group moves, we provide appropriately sized vehicles with professional drivers to keep your group together and on schedule.',
  },
  {
    icon: '🗓️',
    title: 'Ongoing Account Arrangements',
    desc: 'Regular business transport needs? We work with organisations on account-based arrangements with consolidated billing, priority availability, and dedicated account management.',
  },
  {
    icon: '🎉',
    title: 'Special Events & Functions',
    desc: 'Weddings, galas, awards nights, and private functions. We provide prestige vehicles and professional presentation to complement your event.',
  },
  {
    icon: '🚌',
    title: 'Community & Accessible Transport',
    desc: 'Specialist transport services for community organisations, healthcare providers, and groups requiring accessible or tailored vehicle solutions.',
  },
]

const REASONS = [
  'Flexible account-based billing — no upfront payment required',
  'Dedicated point of contact for your organisation',
  'Mixed fleet to suit any group size or occasion',
  'Professional, uniformed drivers',
  'Priority availability for account holders',
  'Consolidated invoicing for easy expense management',
]

export default function ServicesPage() {
  return (
    <>
      <NavWrapper />
      <main>

        {/* Hero */}
        <section className="bg-slate relative overflow-hidden">
          <div className="hero-noise" />
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-16 md:py-24 relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-5 flex items-center gap-2">
              <span className="w-6 h-[2px] bg-accent inline-block" />Our Services
            </p>
            <h1 className="font-display font-extrabold text-[clamp(30px,4.5vw,52px)] leading-[1.07] tracking-tight text-white mb-6 max-w-[640px]">
              Everything we offer, in one place.
            </h1>
            <p className="text-[16px] text-white/60 font-light max-w-[520px] leading-[1.75]">
              From everyday travel to full-scale corporate logistics — explore our complete range of transport services.
            </p>
          </div>
        </section>

        {/* Service types grid */}
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-accent inline-block" />What We Offer
          </p>
          <h2 className="font-display font-bold text-[clamp(22px,3vw,32px)] tracking-tight mb-10">Transport for every need</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICE_TYPES.map(({ icon, title, desc, href, comingSoon, cta }) => (
              <div key={title} className={`bg-white border border-border rounded-xl p-6 flex flex-col ${comingSoon ? 'opacity-60' : ''}`}>
                <span className="text-[28px] block mb-4">{icon}</span>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-bold text-[15px]">{title}</h3>
                  {comingSoon && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] bg-ink-5/60 text-ink-3 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">Coming Soon</span>
                  )}
                </div>
                <p className="text-[13.5px] text-ink-3 leading-[1.7] flex-1 mb-4">{desc}</p>
                {!comingSoon && href && cta && (
                  <Link
                    href={href}
                    className="text-[13px] font-semibold text-accent hover:text-accent-dark transition-colors"
                  >
                    {cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Professional Services */}
        <section id="professional-services" className="bg-bg border-y border-border">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
              <span className="w-4 h-[2px] bg-accent inline-block" />Professional Services
            </p>
            <h2 className="font-display font-bold text-[clamp(22px,3vw,32px)] tracking-tight mb-4">End-to-end corporate transport</h2>
            <p className="text-[14.5px] text-ink-3 leading-[1.75] max-w-[600px] mb-10">
              We partner with businesses, government bodies, and event organisers to deliver reliable, professional transport at scale.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {OFFERINGS.map(({ icon, title, desc }) => (
                <div key={title} className="bg-white border border-border rounded-xl p-6">
                  <span className="text-[28px] block mb-4">{icon}</span>
                  <h3 className="font-display font-bold text-[15px] mb-2">{title}</h3>
                  <p className="text-[13.5px] text-ink-3 leading-[1.7]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why us */}
        <section>
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-accent inline-block" />Why Choose Us
                </p>
                <h2 className="font-display font-bold text-[clamp(22px,3vw,32px)] tracking-tight mb-6">
                  The professional choice for business transport.
                </h2>
                <p className="text-[14.5px] text-ink-3 leading-[1.75] mb-8">
                  We understand that business transport demands reliability, discretion, and flexibility. Our corporate clients benefit from a dedicated service built around their schedule — not ours.
                </p>
                <ul className="space-y-3">
                  {REASONS.map(reason => (
                    <li key={reason} className="flex items-start gap-3 text-[14px] text-ink-2">
                      <span className="text-accent font-bold mt-0.5 flex-shrink-0">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate rounded-2xl p-8 text-white">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Account-based billing</p>
                <p className="font-display font-bold text-[22px] leading-snug mb-4">
                  No per-booking payment required — everything goes on account.
                </p>
                <p className="text-[14px] text-white/60 leading-[1.7]">
                  Corporate account holders receive a single consolidated invoice on an agreed billing cycle. Bookings can be made by any authorised staff member through our vendor portal, with full visibility of booking history.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Enquiry form */}
        <section className="bg-bg border-t border-border">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 items-start">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-accent inline-block" />Get in Touch
                </p>
                <h2 className="font-display font-bold text-[clamp(22px,3vw,32px)] tracking-tight mb-4">
                  Let's talk about your requirements.
                </h2>
                <p className="text-[14.5px] text-ink-3 leading-[1.75] mb-6">
                  Tell us about your organisation and what you need — we'll come back to you promptly to discuss how we can help.
                </p>
                <div className="space-y-3 text-[14px] text-ink-3">
                  <p>✓ No obligation — just a conversation</p>
                  <p>✓ We'll tailor a proposal to your specific needs</p>
                  <p>✓ Response within one business day</p>
                </div>
              </div>
              <CorporateEnquiryForm />
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
