'use client'
import { useState } from 'react'
import NavWrapper from '@/components/ui/NavWrapper'
import Footer from '@/components/ui/Footer'

const inp = 'w-full border border-border rounded-[6px] px-3 py-2.5 text-[13.5px] text-ink bg-white outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all'
const lbl = 'block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

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
          <div>
            {done ? (
              <div className="bg-success-bg border border-success/30 rounded-xl px-8 py-10 text-center">
                <p className="text-[32px] mb-4">✓</p>
                <h3 className="font-display font-bold text-[18px] mb-2">Message received</h3>
                <p className="text-[14px] text-ink-3 leading-[1.7]">
                  Thanks for getting in touch. We&apos;ll review your message and get back to you within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-6 space-y-4">
                {error && (
                  <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[6px] px-3 py-2">{error}</p>
                )}
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input required type="text" className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Email *</label>
                    <input required type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                  <div>
                    <label className={lbl}>Phone <span className="normal-case font-normal">(optional)</span></label>
                    <input type="tel" className={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4XX XXX XXX" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Message *</label>
                  <textarea required className={`${inp} h-32 resize-none`} value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us how we can help…" />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-accent text-white font-display font-bold text-[14px] py-3 rounded-[6px] hover:bg-accent-dark transition-colors disabled:opacity-50">
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
