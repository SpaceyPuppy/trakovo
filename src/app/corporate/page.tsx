import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import CorporateEnquiryForm from './CorporateEnquiryForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Corporate & Events',
  description: 'Professional transport solutions for business travel, conferences, and special events.',
}

const OFFERINGS = [
  {
    icon: '✈️',
    title: 'Executive & Airport Transfers',
    desc: 'Reliable, punctual transfers for executives, VIPs, and business travellers. Meet-and-greet service, flight monitoring, and seamless door-to-door logistics.',
  },
  {
    icon: '🏛️',
    title: 'Conferences & Corporate Events',
    desc: 'Coordinated multi-vehicle transport for conferences, product launches, and corporate retreats. We manage scheduling, routing, and on-the-day logistics so you don\'t have to.',
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

export default function CorporatePage() {
  return (
    <>
      <NavWrapper />
      <main>

        {/* Hero */}
        <section className="bg-slate relative overflow-hidden">
          <div className="hero-noise" />
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-16 md:py-24 relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-5 flex items-center gap-2">
              <span className="w-6 h-[2px] bg-accent inline-block" />Corporate & Events
            </p>
            <h1 className="font-display font-extrabold text-[clamp(30px,4.5vw,52px)] leading-[1.07] tracking-tight text-white mb-6 max-w-[640px]">
              Transport solutions built for business.
            </h1>
            <p className="text-[16px] text-white/60 font-light max-w-[520px] leading-[1.75]">
              From executive transfers to full-scale event logistics, we deliver professional, reliable transport tailored to your organisation's needs.
            </p>
          </div>
        </section>

        {/* What we offer */}
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-accent inline-block" />What We Offer
          </p>
          <h2 className="font-display font-bold text-[clamp(22px,3vw,32px)] tracking-tight mb-10">End-to-end corporate transport</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OFFERINGS.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-border rounded-xl p-6">
                <span className="text-[28px] block mb-4">{icon}</span>
                <h3 className="font-display font-bold text-[15px] mb-2">{title}</h3>
                <p className="text-[13.5px] text-ink-3 leading-[1.7]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why us */}
        <section className="bg-bg border-y border-border">
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
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-14 md:py-20">
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
        </section>

      </main>
      <Footer />
    </>
  )
}
