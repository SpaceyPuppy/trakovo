import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'
import ContactForm from './ContactForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact Us' }

export default function ContactPage() {
  return (
    <>
      <NavWrapper />
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14 pb-16 md:pb-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3 flex items-center gap-2">
          <span className="w-4 h-[2px] bg-accent inline-block" />Get in touch
        </p>
        <h1 className="font-display font-bold text-[clamp(26px,3.5vw,38px)] tracking-tight mb-3">Contact us</h1>
        <p className="text-[15px] text-ink-3 leading-[1.7] max-w-[520px] mb-12">
          Have a question, a special request, or want to discuss something? Fill in the form and we&apos;ll get back to you as soon as possible.
        </p>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left — copy */}
          <div className="space-y-8">
            <div>
              <h2 className="font-display font-bold text-[18px] mb-2">We&apos;re here to help</h2>
              <p className="text-[14px] text-ink-3 leading-[1.75]">
                Whether you&apos;re looking for more information about our vehicles, need a custom quote, or have a general enquiry — drop us a message and a member of our team will respond within one business day.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: '📅', title: 'Booking queries', desc: 'Questions about an existing booking or a new reservation.' },
                { icon: '🚗', title: 'Fleet information', desc: 'Availability, pricing, or specifications for a specific vehicle.' },
                { icon: '💬', title: 'General enquiries', desc: 'Anything else — we\'re happy to chat.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <span className="text-2xl leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="font-semibold text-[14px]">{title}</p>
                    <p className="text-[13px] text-ink-3">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <ContactForm />
        </div>
      </main>
      <Footer />
    </>
  )
}
